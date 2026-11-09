import { html, LitElement, PropertyValues, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface HomeAssistant {
  states: Record<string, EntityState>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<void>;
}
interface EntityState {
  state: string;
  attributes: Record<string, unknown>;
}
interface LovelaceCardConfig {
  type?: string;
  [key: string]: unknown;
}
interface LovelaceCard {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
  getCardSize(): number;
}

interface SmartTimerCardConfig extends LovelaceCardConfig {
  entity?: string;
  name?: string;
  show_buttons?: boolean;
}

const TRIPLE_TAP_WINDOW_MS = 800;
const TAP_SETTLE_MS = 350;

/** Format seconds as a strict HH:MM:SS string. */
export function formatSecondsHMS(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Decide a pause-button gesture.
 * 1 tap (after the settle window) -> toggle. 3+ taps -> reset. 2 taps -> ignore.
 */
export function resolvePauseGesture(tapCount: number): "toggle" | "reset" | "ignore" {
  if (tapCount >= 3) return "reset";
  if (tapCount === 1) return "toggle";
  return "ignore";
}

@customElement("smart-timer-card-editor")
export class SmartTimerCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config: SmartTimerCardConfig = { entity: "" };

  public setConfig(config: SmartTimerCardConfig): void {
    this._config = { show_buttons: true, ...config };
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value as SmartTimerCardConfig;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _label(schema: { name: string }): string {
    return (
      {
        entity: "Smart Timer",
        name: "Name",
        show_buttons: "Show buttons",
      }[schema.name] || schema.name
    );
  }

  protected render() {
    if (!this.hass) return html``;
    const schema = [
      {
        name: "entity",
        required: true,
        selector: { entity: { integration: "smart_timer" } },
      },
      { name: "name", selector: { text: {} } },
      { name: "show_buttons", selector: { boolean: {} } },
    ];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

@customElement("smart-timer-card")
export class SmartTimerCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: SmartTimerCardConfig;

  @state() private _display = "00:00:00";
  @state() private _timerState = "idle";

  private _taps: number[] = [];
  private _tapTimer: number | undefined;
  /** True once this card has observed a non-zero countdown. */
  private _seenRunning = false;
  private _firedThisZero = false;

  public static getConfigElement(): HTMLElement {
    return document.createElement("smart-timer-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return { entity: "", show_buttons: true };
  }

  public setConfig(config: SmartTimerCardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid card configuration");
    }
    this.config = { show_buttons: true, name: "", ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  private get _entityId(): string {
    return this.config?.entity || "";
  }

  private get _entity(): EntityState | undefined {
    return this._entityId ? this.hass?.states?.[this._entityId] : undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") || changed.has("config")) {
      this._updateFromEntity();
    }
  }

  private _updateFromEntity(): void {
    const entity = this._entity;
    if (!entity) {
      this._display = "--:--:--";
      this._timerState = "unavailable";
      return;
    }
    const attrs = entity.attributes || {};
    const formatted = attrs.formatted;
    const remaining = Number(attrs.remaining_seconds);
    const state = String(attrs.state || "idle");
    const display =
      typeof formatted === "string" && /^\d{2,}:\d{2}:\d{2}$/.test(formatted)
        ? formatted
        : formatSecondsHMS(Number.isFinite(remaining) ? remaining : 0);

    this._display = display;
    this._timerState = state;
    this._maybeFire(display, state, remaining);
  }

  /**
   * When a countdown this card has been watching reaches 00:00:00, call the
   * backend `fire` service. The integration also fires from its ticker and
   * dedupes, so automations run once. Opening a dashboard on an already
   * finished timer does not re-fire.
   */
  private _maybeFire(_display: string, state: string, remaining: number): void {
    // Idle at 00:00:00 is a valid default (kitchen timer), not a completion.
    const atZero = state === "finished";
    if (!atZero) {
      if (state === "running" || (Number.isFinite(remaining) && remaining > 0)) {
        this._seenRunning = true;
      }
      this._firedThisZero = false;
      return;
    }
    if (!this._seenRunning || this._firedThisZero || !this._entityId) return;
    this._firedThisZero = true;
    void this._callService("fire");
  }

  private async _callService(
    service: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.hass || !this._entityId) return;
    await this.hass.callService("smart_timer", service, {
      entity_id: this._entityId,
      ...data,
    });
  }

  private _onIncrement(seconds: number): void {
    void this._callService("add_time", { seconds });
  }

  /**
   * Single tap toggles pause/resume. Triple tap (3 clicks inside 800 ms)
   * resets. The single-tap action waits out the settle window so a triple
   * tap does not also pause and resume.
   */
  private _onPauseButton(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    const now = Date.now();
    this._taps = [...this._taps, now].filter((t) => now - t <= TRIPLE_TAP_WINDOW_MS);
    window.clearTimeout(this._tapTimer);

    if (resolvePauseGesture(this._taps.length) === "reset") {
      this._taps = [];
      void this._callService("reset");
      return;
    }
    this._tapTimer = window.setTimeout(() => {
      const gesture = resolvePauseGesture(this._taps.length);
      this._taps = [];
      if (gesture === "toggle") {
        void this._callService("toggle");
      }
    }, TAP_SETTLE_MS);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._tapTimer);
  }

  private _renderButtons() {
    if (this.config?.show_buttons === false) return html``;
    return html`
      <div class="buttons">
        <button class="inc" @click=${() => this._onIncrement(10)}>+10 SEC</button>
        <button class="inc" @click=${() => this._onIncrement(60)}>+1 MIN</button>
        <button class="inc" @click=${() => this._onIncrement(300)}>+5 MIN</button>
        <button class="pause" @click=${(e: Event) => this._onPauseButton(e)}>
          PAUSE / RESET
        </button>
      </div>
    `;
  }

  protected render() {
    if (!this._entityId) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="title">Smart Timer</div>
            <div class="hint">Pick a Smart Timer entity in the card editor.</div>
          </div>
        </ha-card>
      `;
    }
    const title =
      this.config.name ||
      (this._entity?.attributes?.friendly_name as string) ||
      "Smart Timer";
    return html`
      <ha-card>
        <div class="card-content">
          <div class="header">
            <span class="title">${title}</span>
            <span class="status ${this._timerState}">${this._timerState}</span>
          </div>
          <div
            class="clock ${this._timerState === "running" ? "running" : ""} ${this._timerState === "finished" ? "finished" : ""}"
          >
            ${this._display}
          </div>
          ${this._renderButtons()}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      overflow: hidden;
    }
    .card-content {
      padding: 8px 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--primary-text-color);
    }
    .header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .title {
      font-size: var(--ha-font-size-m, 1rem);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
    }
    .clock {
      font-family: var(--ha-font-family-code, var(--code-font-family, ui-monospace, monospace));
      font-size: 1.6rem;
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: 1.1;
      letter-spacing: 0.04em;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
      padding: 2px 0 4px;
    }
    .clock.running {
      color: var(--primary-color);
    }
    .clock.finished {
      color: var(--error-color);
    }
    .status {
      text-transform: uppercase;
      font-size: var(--ha-font-size-xs, 0.7rem);
      letter-spacing: 0.04em;
      color: var(--secondary-text-color);
    }
    .status.running {
      color: var(--primary-color);
    }
    .status.finished {
      color: var(--error-color);
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 0.85rem);
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    button {
      border: none;
      border-radius: var(--ha-card-border-radius, var(--mdc-shape-small, 4px));
      padding: 8px 4px;
      font-size: var(--ha-font-size-s, 0.8rem);
      font-weight: var(--ha-font-weight-medium, 500);
      letter-spacing: 0.02em;
      cursor: pointer;
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    button:active {
      filter: brightness(0.92);
    }
    button.inc {
      color: var(--primary-color);
    }
    button.pause {
      grid-column: 1 / -1;
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "smart-timer-card": SmartTimerCard;
    "smart-timer-card-editor": SmartTimerCardEditor;
  }
  interface Window {
    customCards: Array<Record<string, unknown>>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "smart-timer-card",
  name: "Smart Timer",
  description: "Countdown with +10s / +1m / +5m and triple-tap reset.",
  preview: true,
  documentationURL: "https://github.com/MrWaggel/hatimer",
});
