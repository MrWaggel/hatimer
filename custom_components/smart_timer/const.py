"""Constants for the Smart Timer integration."""

from __future__ import annotations

from homeassistant.const import Platform

DOMAIN = "smart_timer"
VERSION = "1.1.0"
PLATFORMS: list[Platform] = [Platform.SENSOR]

# Frontend bundle served by the integration (Marketplace installs one type).
CARD_URL = "/smart_timer/smart-timer-card.js"

# ---------------------------------------------------------------------------
# Config flow / options keys
# ---------------------------------------------------------------------------
CONF_TIMER_NAME = "name"
CONF_INITIAL_SECONDS = "initial_seconds"
CONF_MEDIA_PLAYER = "media_player"
CONF_SOUND_URL = "sound_url"
CONF_SOUND_PATH = "sound_path"
CONF_SOUND_VOLUME = "sound_volume"

DEFAULT_INITIAL_SECONDS = 300  # 5 minutes
DEFAULT_SOUND_VOLUME = 100

# Maximum seconds a single timer can hold (guards against runaway values).
MAX_SECONDS = 24 * 60 * 60  # 24 hours

# ---------------------------------------------------------------------------
# Event fired on the HA event bus when a timer reaches zero.
# ---------------------------------------------------------------------------
EVENT_ON_FIRE = f"{DOMAIN}_on_fire"

EVENT_ATTR_DEVICE_ID = "device_id"
EVENT_ATTR_ENTITY_ID = "entity_id"
EVENT_ATTR_TIMER_NAME = "name"
EVENT_ATTR_TOTAL_SECONDS = "total_seconds"

# ---------------------------------------------------------------------------
# Sensor state machine.
# ---------------------------------------------------------------------------
STATE_IDLE = "idle"
STATE_RUNNING = "running"
STATE_PAUSED = "paused"
STATE_FINISHED = "finished"

# ---------------------------------------------------------------------------
# Sensor attributes.
# ---------------------------------------------------------------------------
ATTR_TIMER_STATE = "state"
ATTR_REMAINING_SECONDS = "remaining_seconds"
ATTR_TOTAL_SECONDS = "total_seconds"
ATTR_FORMATTED = "formatted"
ATTR_SOUND = "sound"
ATTR_DEVICE_ID = "device_id"
ATTR_ENTITY_ID = "entity_id"

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
SERVICE_ADD_TIME = "add_time"
SERVICE_SET_TIME = "set_time"
SERVICE_START = "start"
SERVICE_PAUSE = "pause"
SERVICE_RESUME = "resume"
SERVICE_TOGGLE = "toggle"
SERVICE_RESET = "reset"
SERVICE_FIRE = "fire"
SERVICE_SET_SOUND = "set_sound"

# Service call parameters
ATTR_SECONDS = "seconds"
ATTR_MINUTES = "minutes"

# ---------------------------------------------------------------------------
# Ticker cadence (seconds). Update the sensor state this often while running.
# ---------------------------------------------------------------------------
TICK_INTERVAL = 1

# Prefix that makes a configured device / sensor belong to this integration.
SENSOR_DOMAIN_PREFIX = "smart_timer_"