# Smart Timer

A configurable, multi-instance **Smart Timer** for Home Assistant: a backend
custom integration that creates one timer device per config entry, plus a
dashboard card with interactive `+10 SEC` / `+1 MIN` / `+5 MIN` shortcuts and a
triple-tap-to-reset action. When a timer reaches zero it plays a sound you
choose and fires the `smart_timer_on_fire` event you can hook into.

---

## Features

- **Multiple devices** — create as many independent Smart Timers as you like
  (e.g. *Pizza*, *Episode*, *Yoga*), each with its own device registry entry.
- **Config Flow** — add a timer from **Settings → Devices & services → Add
  integration**.
- **Options Flow** — per-timer, configure an arbitrary sound: a media player
  entity, a sound URL, or a local file path.
- **Services** — `smart_timer.add_time`, `set_time`, `start`, `pause`,
  `resume`, `toggle`, `reset`, `set_sound` and `fire`.
- **Event bus** — fires `smart_timer_on_fire` when a timer hits zero, with the
  device id, entity id, name and total seconds in the event data.
- **Reliable ticker** — countdown runs off a real `end_time` timestamp on the
  event loop, updating state every second.
- **Reboot safe** — remaining time and state are restored on restart (a running
  timer restores as paused so nothing surprises you).
- **Lovelace card** — modern responsive Lit-based card with strict `HH:MM:SS`
  display, increment buttons, and multi-tap pause/resume/reset.

---

## Repository layout

```
smart-timer/
├── hacs.json                          # Marketplace / HACS descriptor
├── custom_components/
│   └── smart_timer/                   # Backend integration
│       ├── __init__.py                # config-entry setup + domain services
│       ├── const.py                   # constants
│       ├── config_flow.py             # config + options flows
│       ├── sensor.py                  # timer sensor entity + ticker
│       ├── services.yaml              # service schemas
│       ├── manifest.json
│       └── translations/en.json
├── www/community/smart-timer-card/    # Built card (dashboard resource)
├── dist/smart-timer-card.js           # Standalone built card bundle
├── frontend/                          # Card source (Lit + TypeScript)
│   ├── src/smart-timer-card.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── rollup.config.mjs
└── examples/automations.yaml          # `on-fire` automation examples
```

---

## Installation

Marketplace only accepts **GitHub** repositories. This project lives at
[github.com/MrWaggel/hatimer](https://github.com/MrWaggel/hatimer).

### 1. Install the integration

**Settings → Marketplace → Add from a GitHub link** and paste:

```
https://github.com/MrWaggel/hatimer
```

Install the **Smart Timer** integration, then restart Home Assistant.

The integration registers the dashboard card itself (it is served from the
integration folder). You do not add a separate dashboard resource. After the
restart, hard-refresh the browser once so the card module loads.

**Manual install:** copy `custom_components/smart_timer/` into
`<config>/custom_components/smart_timer/` and restart.

### 2. Add timer(s)

1. **Settings → Devices & services → Add integration → Smart Timer**.
2. Enter a **name** and an **initial countdown duration**.
3. Repeat for as many timers as you want. Each one is its own device.

Open the entry's **Configure** / options menu to set the sound:

- a **media player** entity, and/or
- a **sound URL** or **local file path** (for example `/config/www/ding.mp3`).

### 3. Add the dashboard card

Edit a dashboard → **Add card** → **Smart Timer** → pick the timer entity.

```yaml
type: custom:smart-timer-card
entity: sensor.pizza
name: Pizza Timer   # optional
show_buttons: true  # optional (default true)
```

---

## Card behaviour

- The countdown is always shown as strict `HH:MM:SS`.
- **`+10 SEC` / `+1 MIN` / `+5 MIN`** immediately start/resume the timer and
  add the chosen amount to the current countdown.
- **PAUSE / RESET** single tap pauses or resumes. The tap waits a fraction of
  a second so it can tell a single tap from a triple tap.
- **Triple-tap** (three presses within 0.8&nbsp;s) **resets** the timer to its
  initial duration. The extra taps are not also treated as pause/resume.
- When the countdown reaches `00:00:00` the ticker fires `smart_timer.fire`.
  The card calls the same service if it watched the countdown hit zero. A
  second call within 2 seconds is ignored, so automations run once. Opening a
  dashboard on a timer that is already finished does not fire again.

---

## Services

All services target a Smart Timer sensor entity and accept
`entity_id: sensor.<timer_name>`.

| Service | Description |
| --- | --- |
| `smart_timer.add_time` | Add seconds/minutes and start/resume. |
| `smart_timer.set_time` | Set an absolute remaining time and start. |
| `smart_timer.start` | Start (or resume) the countdown. |
| `smart_timer.pause` | Pause without resetting. |
| `smart_timer.resume` | Resume a paused timer. |
| `smart_timer.toggle` | Pause if running, otherwise start/resume. |
| `smart_timer.reset` | Reset to the initial duration (idle). |
| `smart_timer.fire` | Fire `smart_timer_on_fire` now and play the sound. |
| `smart_timer.set_sound` | Update the sound config at runtime. |

Example — add 90 seconds to the *Pizza* timer:

```yaml
service: smart_timer.add_time
target:
  entity_id: sensor.pizza
data:
  minutes: 1
  seconds: 30
```

---

## Automations: the `on-fire` event

When a timer reaches zero it fires `smart_timer_on_fire` with:

| Key | Example value |
| --- | --- |
| `device_id` | the timer device registry id |
| `entity_id` | `sensor.pizza` |
| `name` | `Pizza` |
| `total_seconds` | `300` |

```yaml
alias: Smart Timer finished
triggers:
  - trigger: event
    event_type: smart_timer_on_fire
    event_data:
      entity_id: sensor.pizza
actions:
  - service: light.turn_on
    target:
      entity_id: light.kitchen
  - service: notify.mobile_app_phone
    data:
      title: Timer done
      message: "{{ trigger.event.data.name }} is finished!"
```

Flicker a light when *any* timer finishes:

```yaml
alias: Any timer done
triggers:
  - trigger: event
    event_type: smart_timer_on_fire
actions:
  - repeat:
      count: 3
      sequence:
        - service: light.turn_on
          target: { entity_id: light.kitchen }
        - service: light.turn_off
          target: { entity_id: light.kitchen }
        - delay: "00:00:00.5"
```

See [examples/automations.yaml](./examples/automations.yaml) for more.

---

## Developer

Build the card (requires Node 18+):

```bash
cd frontend
npm install
npm run dist   # writes dist/smart-timer-card.js + www/community/...
```

Rebuild the frontend source, then copy the `dist/smart-timer-card.js` bundle (or
`www/community/smart-timer-card/smart-timer-card.js`) into your HA config.

---

## License

MIT (see [LICENSE](./LICENSE)).

> This project is community-made and not part of Home Assistant core. Content
> and code are supported by the community.