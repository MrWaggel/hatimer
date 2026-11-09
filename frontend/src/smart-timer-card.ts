import { html, LitElement, PropertyValues, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Minimal local type shims (keeps the bundle self-contained; these are erased
// at build time and are structurally compatible with HA's runtime types).
export interface HomeAssistant {
  states: Record<string, EntityState>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
}
interface EntityState {
  state: string;
  attributes: Record<string, unknown>;
}
interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}
interface LovelaceCard {
  hass?: HomeAssistant;
  config?: LovelaceCardConfig;
  setConfig(config: LovelaceCardConfig): void;
  getCardSize(): number;
}

interface SmartTimerCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  show_buttons?: boolean;
  accent?: string;
}

interface TimerEntity {
  state: string;
  attributes: Record<string, unknown>;
}

/** Format seconds as a strict HH:MM:SS string. */
function formatSecondsHMS(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Parse a strict HH:MM:SS string into whole seconds. */
function parseHMS(value: string): number {
  const parts = String(value || "").trim().split(":");
  if (parts.length < 3) return 0;
  const [h = 0, m = 0, s = 0] = parts.map((p) => Number(p) || 0);
  return h * 3600 + m * 60 + s;
}

const TRIPLE_TAP_WINDOW_MS = 1500;

@customElement("smart-timer-card")
export class SmartTimerCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: SmartTimerCardConfig;

  @state() private _display = "00:00:00";
  @state() private _timerState = "idle";
  @state() private _hasError = false;

  private _tapQueue: number[] = [];

  public static getStubConfig(): Record<string, unknown> {
    return { entity: "", show_buttons: true };
  }

  public setConfig(config: SmartTimerCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Please configure a Smart Timer entity for this card.");
    }
    this.config = { name: "", show_buttons: true, ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  private get _entityId(): string {
    return this.config.entity;
  }

  private get _entity(): TimerEntity | undefined {
    return this.hass?.states?.[this._entityId];
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      this._updateFromEntity();
    }
  }

  private _updateFromEntity(): void {
    const entity = this._entity;
    if (!entity) {
      this._hasError = true;
      this._display = "--:--:--";
      return;
    }
    this._hasError = false;

    const attrs = entity.attributes || {};
    const formatted = attrs.formatted;
    const remaining = Number(attrs.remaining_seconds);
    const state: string = String(attrs.state || entity.state || "idle");

    let display: string;
    if (typeof formatted === "string" && /^\d{1,3}:\d{2}:\d{2}/.test(formatted)) {
      display = formatted;
    } else if (Number.isFinite(remaining)) {
      display = formatSecondsHMS(remaining);
    } else {
      display = formatSecondsHMS(parseHMS(entity.state));
    }
    this._display = display;
    this._timerState = state;

    // Completion is handled by the backend: when the countdown reaches zero the
    // integration fires `smart_timer_on_fire` and plays the configured sound.
    // We only reflect the finished state here and do not re-fire the event, to
    // avoid triggering user automations twice.
  }

  private async _callService(service: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!this.hass) return;
    await this.hass.callService("smart_timer", service, {
      entity_id: this._entityId,
      ...data,
    });
  }

  private _onIncrement(seconds: number): void {
    // Increment buttons are single-purpose: add time and start/resume.
    void this._callService("add_time", { seconds });
  }

  /**
   * PAUSE button multi-tap logic:
   *   - Triple tap within 1.5 s -> reset the timer to its initial value.
   *   - Any single tap (otherwise) -> toggle pause / resume / start.
   */
  private _onPauseButton(ev: MouseEvent): void {
    ev.stopPropagation();
    const now = Date.now();
    this._tapQueue.push(now);
    this._tapQueue = this._tapQueue.filter((t) => now - t <= TRIPLE_TAP_WINDOW_MS);

    if (this._tapQueue.length >= 3) {
      this._tapQueue = [];
      void this._callService("reset");
      return;
    }
    void this._callService("toggle");
  }

  private _renderButtons(): unknown {
    if (this.config.show_buttons === false) return html``;
    const label =
      this._timerState === "running"
        ? "PAUSE"
        : this._timerState === "idle" || this._timerState === "finished"
          ? "START"
          : "RESUME";
    return html`
      <div class="buttons">
        <button class="inc" @click=${() => this._onIncrement(10)}>+10 SEC</button>
        <button class="inc" @click=${() => this._onIncrement(60)}>+1 MIN</button>
        <button class="inc" @click=${() => this._onIncrement(300)}>+5 MIN</button>
        <button class="pause" @click=${(e: MouseEvent) => this._onPauseButton(e)}>${label}</button>
      </div>
    `;
  }

  protected render(): unknown {
    const title =
      this.config.name || this._entity?.attributes?.friendly_name || "Smart Timer";
    const running = this._timerState === "running";
    return html`
      <ha-card>
        <div class="card-content">
          <div class="header">
            <span class="title">${title}</span>
            ${this._entity
              ? html`
                  <ha-state-badge
                    .hass=${this.hass}
                    .stateObj=${this._entity}
                  ></ha-state-badge>
                `
              : ""}
          </div>
          <div class="clock ${running ? "running" : ""} ${this._timerState === "finished" ? "finished" : ""}">
            ${this._display}
          </div>
          <div class="status ${this._timerState}">
            ${this._hasError ? "unavailable" : this._timerState}
          </div>
          <div class="hint">Triple-tap the large button to reset</div>
          ${this._renderButtons()}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      overflow: hidden;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
      box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.2));
    }
    .card-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: var(--paper-font-common-base_-_font-family, sans-serif);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--primary-text-color, #000);
    }
    .clock {
      font-family: "Roboto Mono", var(--paper-font-code_-_font-family, monospace);
      font-size: 3.2rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 2px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color, #333);
      background: var(--secondary-background-color, #f2f2f2);
      border-radius: 12px;
      padding: 18px 8px;
    }
    .clock.running {
      color: var(--state-active-color, #07c);
      box-shadow: inset 0 0 0 2px var(--state-active-color, #07c);
    }
    .clock.finished {
      color: var(--error-color, #db4437);
      animation: pulse 1s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    .status {
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 1px;
      text-align: center;
      color: var(--secondary-text-color, #888);
    }
    .status.running {
      color: var(--state-active-color, #07c);
    }
    .status.finished {
      color: var(--error-color, #db4437);
    }
    .hint {
      text-align: center;
      font-size: 0.7rem;
      color: var(--secondary-text-color, #aaa);
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    button {
      border: none;
      border-radius: 10px;
      padding: 12px 8px;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      cursor: pointer;
      color: var(--primary-text-color, #000);
      background: var(--secondary-background-color, #f2f2f2);
      transition: transform 0.05s ease, filter 0.1s ease;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    button:active {
      transform: scale(0.96);
      filter: brightness(0.95);
    }
    button.inc {
      color: var(--state-active-color, #07c);
    }
    button.pause {
      grid-column: 1 / -1;
      color: #fff;
      background: var(--state-inactive-color, #888);
    }
    button.pause:active {
      filter: brightness(0.9);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "smart-timer-card": SmartTimerCard;
  }
  interface Window {
    customCards: Array<Record<string, unknown>>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "smart-timer-card",
  name: "Smart Timer",
  description: "Interactive countdown timer with +/- shortcuts and triple-tap reset.",
  preview: false,
  documentationURL: "https://example.com/smart-timer",
});