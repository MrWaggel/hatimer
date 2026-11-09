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
  show_pause_reset?: boolean;
  title_size?: number;
  clock_size?: number;
  button_size?: number;
  button_padding?: number;
}

const FINISH_ALERT_MS = 15000;
const DEFAULT_ALARM_URLS = [
  "/local/smart_timer/kitchen-timer.mp3",
  "/smart_timer/kitchen-timer.mp3",
];

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
    this._config = {
      show_buttons: true,
      show_pause_reset: true,
      title_size: 1,
      clock_size: 1.6,
      button_size: 0.8,
      button_padding: 8,
      ...config,
    };
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
        show_buttons: "Show + time buttons",
        show_pause_reset: "Show PAUSE / RESET button",
        title_size: "Title size",
        clock_size: "Timer text size",
        button_size: "Button text size",
        button_padding: "Button size",
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
      { name: "show_pause_reset", selector: { boolean: {} } },
      {
        name: "title_size",
        selector: { number: { min: 0.7, max: 2.5, step: 0.1, mode: "box", unit_of_measurement: "rem" } },
      },
      {
        name: "clock_size",
        selector: { number: { min: 1, max: 5, step: 0.1, mode: "box", unit_of_measurement: "rem" } },
      },
      {
        name: "button_size",
        selector: { number: { min: 0.6, max: 1.6, step: 0.05, mode: "box", unit_of_measurement: "rem" } },
      },
      {
        name: "button_padding",
        selector: { number: { min: 2, max: 24, step: 1, mode: "box", unit_of_measurement: "px" } },
      },
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
  @state() private _alerting = false;

  private _taps: number[] = [];
  private _tapTimer: number | undefined;
  private _alertTimer: number | undefined;
  private _alertDone = false;
  private _onScreen = false;
  private _observer?: IntersectionObserver;
  private _pendingAlarm = false;
  /** True once this card has observed a non-zero countdown. */
  private _seenRunning = false;
  private _firedThisZero = false;

  public static getConfigElement(): HTMLElement {
    return document.createElement("smart-timer-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      entity: "",
      show_buttons: true,
      show_pause_reset: true,
      title_size: 1,
      clock_size: 1.6,
      button_size: 0.8,
      button_padding: 8,
    };
  }

  public setConfig(config: SmartTimerCardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid card configuration");
    }
    this.config = {
      show_buttons: true,
      show_pause_reset: true,
      title_size: 1,
      clock_size: 1.6,
      button_size: 0.8,
      button_padding: 8,
      name: "",
      ...config,
    };
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
    this._maybeFire(state, remaining);
    this._syncAlert(state);
  }

  /**
   * When a countdown this card has been watching reaches 00:00:00, call the
   * backend `fire` service. The integration also fires from its ticker and
   * dedupes, so automations run once. Opening a dashboard on an already
   * finished timer does not re-fire.
   */
  private _maybeFire(state: string, remaining: number): void {
    // Idle at 00:00:00 is a valid default (kitchen timer), not a completion.
    if (state !== "finished") {
      if (state === "running" || (Number.isFinite(remaining) && remaining > 0)) {
        this._seenRunning = true;
      }
      this._firedThisZero = false;
      return;
    }
    if (!this._seenRunning || this._firedThisZero || !this._entityId) return;
    this._firedThisZero = true;
    void this._callService("fire");
    this._playAlarm();
  }

  private _syncAlert(state: string): void {
    if (state !== "finished" || !this._seenRunning) {
      this._alerting = false;
      this._alertDone = false;
      window.clearTimeout(this._alertTimer);
      this._alertTimer = undefined;
      return;
    }
    if (this._alertDone || this._alertTimer != null) return;
    this._alerting = true;
    this._alertTimer = window.setTimeout(() => {
      this._alerting = false;
      this._alertDone = true;
      this._alertTimer = undefined;
    }, FINISH_ALERT_MS);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._observer = new IntersectionObserver((entries) => {
      this._onScreen = entries.some((entry) => entry.isIntersecting);
    });
    this._observer.observe(this);
  }

  private _cardIsVisible(): boolean {
    if (document.visibilityState === "hidden") return false;
    if (this._onScreen) return true;
    const rect = this.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  }

  private _alarmUrls(): string[] {
    const url = this._entity?.attributes?.alarm_url;
    if (url === null || url === false || url === "") return [];
    if (typeof url === "string" && url && !DEFAULT_ALARM_URLS.includes(url)) {
      return [url, ...DEFAULT_ALARM_URLS];
    }
    if (this._entity?.attributes?.sound === "none") return [];
    return DEFAULT_ALARM_URLS;
  }

  private _alarmElement(): HTMLAudioElement | null {
    return this.renderRoot?.querySelector("audio") ?? null;
  }

  /** Browsers block audio until a tap. Call this from a pointer handler. */
  private _unlockAudio(): void {
    const audio = this._alarmElement();
    if (!audio) return;
    const url = this._alarmUrls()[0];
    if (url && audio.getAttribute("src") !== url) audio.src = url;
    if (!audio.src) return;
    const volume = audio.volume;
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume || 1;
        if (this._pendingAlarm) {
          this._pendingAlarm = false;
          void this._playAlarm();
        }
      })
      .catch(() => {
        audio.volume = volume || 1;
      });
  }

  private _playAlarm(): void {
    if (!this._cardIsVisible()) return;
    const urls = this._alarmUrls();
    const audio = this._alarmElement();
    if (!urls.length || !audio) return;
    void this._playFirst(audio, urls);
  }

  private async _playFirst(audio: HTMLAudioElement, urls: string[]): Promise<void> {
    for (const url of urls) {
      audio.src = url;
      audio.volume = 1;
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers throw if metadata is not loaded yet.
      }
      try {
        await audio.play();
        this._pendingAlarm = false;
        return;
      } catch {
        // Autoplay block or a missing file. Try the next URL.
      }
    }
    this._pendingAlarm = true;
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
  private _stopAlarm(): void {
    const audio = this._alarmElement();
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore if the file has not loaded yet.
    }
    this._pendingAlarm = false;
  }

  /** First tap on the clock after zero: silence the alarm and return to idle. */
  private _onTimerTap(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this._timerState === "finished") {
      this._stopAlarm();
      this._taps = [];
      window.clearTimeout(this._tapTimer);
      void this._callService("reset");
      return;
    }
    this._onPauseButton(ev);
  }

  private _onPauseButton(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this._unlockAudio();
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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._tapTimer);
    window.clearTimeout(this._alertTimer);
    this._observer?.disconnect();
    this._alarmElement()?.pause();
  }

  private _sizeStyle(): string {
    const title = Number(this.config?.title_size ?? 1);
    const clock = Number(this.config?.clock_size ?? 1.6);
    const button = Number(this.config?.button_size ?? 0.8);
    const pad = Number(this.config?.button_padding ?? 8);
    return [
      `--st-title-size:${title}rem`,
      `--st-clock-size:${clock}rem`,
      `--st-button-size:${button}rem`,
      `--st-button-pad:${pad}px`,
    ].join(";");
  }

  private _renderButtons() {
    const showInc = this.config?.show_buttons !== false;
    const showPause = this.config?.show_pause_reset !== false;
    if (!showInc && !showPause) return html``;
    return html`
      <div class="buttons ${showInc ? "" : "pause-only"}">
        ${showInc
          ? html`
              <button class="inc" @click=${() => this._onIncrement(10)}>+10 SEC</button>
              <button class="inc" @click=${() => this._onIncrement(60)}>+1 MIN</button>
              <button class="inc" @click=${() => this._onIncrement(300)}>+5 MIN</button>
            `
          : ""}
        ${showPause
          ? html`
              <button class="pause" @click=${(e: Event) => this._onPauseButton(e)}>
                PAUSE / RESET
              </button>
            `
          : ""}
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
        <div class="card-content" style=${this._sizeStyle()}>
          <div class="header">
            <span class="title">${title}</span>
            <span class="status ${this._timerState} ${this._alerting ? "alert" : ""}">${this._timerState}</span>
          </div>
          <div
            class="clock ${this._timerState === "running" && !this._alerting ? "running" : ""} ${this._alerting ? "alert" : ""}"
            role="button"
            tabindex="0"
            @click=${(e: Event) => this._onTimerTap(e)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") this._onTimerTap(e);
            }}
          >
            ${this._display}
          </div>
          <audio playsinline preload="auto" src="/local/smart_timer/kitchen-timer.mp3"></audio>
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
      font-size: var(--st-title-size, var(--ha-font-size-m, 1rem));
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
    }
    .clock {
      font-family: var(--ha-font-family-code, var(--code-font-family, ui-monospace, monospace));
      font-size: var(--st-clock-size, 1.6rem);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: 1.1;
      letter-spacing: 0.04em;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
      padding: 2px 0 4px;
      cursor: pointer;
    }
    .clock.running {
      color: var(--primary-color);
    }
    .clock.alert {
      color: var(--error-color);
      animation: smart-timer-flash 1s ease-in-out infinite;
    }
    @keyframes smart-timer-flash {
      50% {
        opacity: 0.35;
      }
    }
    audio {
      display: none;
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
    .status.alert {
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
      font-size: var(--st-button-size, var(--ha-font-size-s, 0.8rem));
      font-weight: var(--ha-font-weight-medium, 500);
      letter-spacing: 0.02em;
      cursor: pointer;
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
      padding: var(--st-button-pad, 8px) 4px;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    button:active {
      filter: brightness(0.92);
    }
    button.inc {
      color: var(--primary-color);
    }
    button.pause,
    .buttons.pause-only {
      grid-column: 1 / -1;
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
