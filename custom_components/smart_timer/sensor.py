"""Sensor entity for the Smart Timer integration."""

from __future__ import annotations

import logging
import time

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    ALARM_URL,
    ATTR_ALARM_URL,
    ATTR_DEVICE_ID,
    ATTR_ENTITY_ID,
    ATTR_FORMATTED,
    ATTR_REMAINING_SECONDS,
    ATTR_SOUND,
    ATTR_TIMER_STATE,
    ATTR_TOTAL_SECONDS,
    ATTR_DEFAULT_SECONDS,
    CONF_DEFAULT_SECONDS,
    CONF_INITIAL_SECONDS,
    CONF_MEDIA_PLAYER,
    CONF_SOUND_PATH,
    CONF_SOUND_SOURCE,
    CONF_SOUND_URL,
    CONF_SOUND_VOLUME,
    DEFAULT_INITIAL_SECONDS,
    DEFAULT_SOUND_VOLUME,
    DOMAIN,
    SOUND_CUSTOM,
    SOUND_DEFAULT,
    SOUND_NONE,
    EVENT_ATTR_DEVICE_ID,
    EVENT_ATTR_ENTITY_ID,
    EVENT_ATTR_TIMER_NAME,
    EVENT_ATTR_TOTAL_SECONDS,
    EVENT_ON_FIRE,
    TICK_INTERVAL,
    VERSION,
)
from .timer_engine import TimerEngine, format_seconds

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities,
) -> None:
    """Set up the Smart Timer sensor for a config entry."""
    async_add_entities([SmartTimerSensor(hass, entry)], update_before_add=False)


class SmartTimerSensor(RestoreEntity, SensorEntity):
    """A configurable countdown timer exposed as a sensor."""

    _attr_should_poll = False
    _attr_has_entity_name = False
    _attr_icon = "mdi:timer-outline"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the sensor."""
        self.hass = hass
        self.entry = entry
        initial = entry.data.get(CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS)
        self._engine = TimerEngine(initial)
        self._tick_handle = None

        name = entry.data.get("name", "Smart Timer")
        self._attr_unique_id = f"{DOMAIN}_{entry.entry_id}"
        self._attr_name = name
        self._attr_device_class = "duration"
        self._attr_native_unit_of_measurement = "s"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=name,
            manufacturer="Smart Timer",
            model="Smart Timer",
            sw_version=VERSION,
        )
        # Create the device up front so device_id is available immediately.
        dr.async_get(hass).async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={(DOMAIN, entry.entry_id)},
            name=name,
            manufacturer="Smart Timer",
            model="Smart Timer",
            sw_version=VERSION,
        )

    # ------------------------------------------------------------------
    # State
    # ------------------------------------------------------------------
    @property
    def native_value(self) -> int:
        """Remaining time in whole seconds."""
        return int(round(self._engine.remaining))

    @property
    def icon(self) -> str:
        """Icon reflecting the timer state."""
        if self._engine.state == "running":
            return "mdi:timer"
        if self._engine.state == "paused":
            return "mdi:timer-pause"
        if self._engine.state == "finished":
            return "mdi:timer-alert"
        return "mdi:timer-outline"

    @property
    def extra_state_attributes(self) -> dict:
        """Expose rich state for the card and automations."""
        return {
            ATTR_TIMER_STATE: self._engine.state,
            ATTR_REMAINING_SECONDS: int(round(self._engine.remaining)),
            ATTR_TOTAL_SECONDS: int(round(self._engine.total)),
            ATTR_DEFAULT_SECONDS: int(round(self._engine.default)),
            ATTR_FORMATTED: format_seconds(self._engine.remaining),
            ATTR_SOUND: self.sound_summary,
            ATTR_ALARM_URL: self.alarm_url,
            ATTR_DEVICE_ID: self.device_id,
            ATTR_ENTITY_ID: self.entity_id,
        }

    @property
    def device_id(self) -> str | None:
        """Device-registry id (not the config-entry id)."""
        if self.registry_entry and self.registry_entry.device_id:
            return self.registry_entry.device_id
        device = dr.async_get(self.hass).async_get_device(
            identifiers={(DOMAIN, self.entry.entry_id)}
        )
        return device.id if device else None

    @property
    def sound_summary(self) -> str | None:
        """Human description of the configured sound."""
        opts = self._options()
        source = opts.get(CONF_SOUND_SOURCE)
        custom = opts.get(CONF_SOUND_URL) or opts.get(CONF_SOUND_PATH)
        if source == SOUND_NONE:
            return None
        if source == SOUND_CUSTOM:
            return custom
        if source == SOUND_DEFAULT or not custom:
            return "kitchen-timer.mp3"
        return custom

    @property
    def alarm_url(self) -> str | None:
        """URL the dashboard card can play in the browser. None means no sound."""
        opts = self._options()
        source = opts.get(CONF_SOUND_SOURCE)
        custom = opts.get(CONF_SOUND_URL) or opts.get(CONF_SOUND_PATH)
        if source == SOUND_NONE:
            return None
        if source == SOUND_CUSTOM:
            if isinstance(custom, str) and (
                custom.startswith(("http://", "https://", "/"))
            ):
                return custom
            return None
        return ALARM_URL

    def _configured_default(self) -> float:
        opts = self._options()
        if opts.get(CONF_DEFAULT_SECONDS) is not None:
            return float(opts[CONF_DEFAULT_SECONDS])
        return float(self.entry.data.get(CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS))

    def apply_configured_default(self) -> None:
        """Pick up a default changed in options. Idle timers snap to it."""
        self._engine.set_default(self._configured_default())
        if self._engine.state == "idle":
            self._engine.remaining = self._engine.default
            self._engine.total = self._engine.default

    def _options(self) -> dict:
        entry = self.hass.config_entries.async_get_entry(self.entry.entry_id)
        return dict((entry or self.entry).options)

    def _publish(self) -> None:
        self.async_write_ha_state()

    # ------------------------------------------------------------------
    # Ticker
    # ------------------------------------------------------------------
    def _schedule_tick(self) -> None:
        if self._engine.state != "running":
            return
        self._unschedule_tick()
        self._tick_handle = self.hass.loop.call_later(TICK_INTERVAL, self._tick)

    @callback
    def _tick(self) -> None:
        self._tick_handle = None
        finished = self._engine.tick(time.monotonic())
        self._publish()
        if finished:
            self.hass.async_create_task(self._fire())
            return
        self._schedule_tick()

    def _unschedule_tick(self) -> None:
        if self._tick_handle is not None:
            self._tick_handle.cancel()
            self._tick_handle = None

    # ------------------------------------------------------------------
    # Operations used by services and the card
    # ------------------------------------------------------------------
    def start(self) -> None:
        """Start or resume."""
        self._engine.start(time.monotonic())
        self._schedule_tick()
        self._publish()

    def pause(self) -> None:
        """Pause, freezing the exact remaining time."""
        self._engine.pause(time.monotonic())
        self._unschedule_tick()
        self._publish()

    def resume(self) -> None:
        """Resume a paused countdown."""
        if self._engine.state != "paused":
            return
        self.start()

    def toggle(self) -> None:
        """Pause if running, otherwise start."""
        self._engine.toggle(time.monotonic())
        if self._engine.state == "running":
            self._schedule_tick()
        else:
            self._unschedule_tick()
        self._publish()

    def reset(self) -> None:
        """Reset to the configured default duration, including 0."""
        self._unschedule_tick()
        self._engine.set_default(self._configured_default())
        self._engine.reset()
        self._publish()

    def set_time(self, seconds: float) -> None:
        """Set an absolute remaining time and start."""
        self._engine.set_time(seconds, time.monotonic())
        self._schedule_tick()
        self._publish()

    def add_time(self, seconds: float) -> None:
        """Add time and immediately start or resume."""
        self._engine.add_time(seconds, time.monotonic())
        self._schedule_tick()
        self._publish()

    def set_sound(
        self,
        *,
        media_player=None,
        sound_url=None,
        sound_path=None,
        volume=None,
    ) -> None:
        """Update sound configuration without reloading the running timer."""
        opts = self._options()
        if media_player is not None:
            opts[CONF_MEDIA_PLAYER] = media_player or None
        if sound_url is not None:
            opts[CONF_SOUND_URL] = sound_url or None
        if sound_path is not None:
            opts[CONF_SOUND_PATH] = sound_path or None
        if volume is not None:
            opts[CONF_SOUND_VOLUME] = volume
        self.hass.config_entries.async_update_entry(self.entry, options=opts)
        self._publish()

    def fire(self) -> None:
        """Fire the on-fire event and play the configured sound.

        A second call within a short window (the card confirming a zero the
        ticker already handled) is ignored so automations run once.
        """
        now = time.monotonic()
        if not self._engine.should_fire(now):
            _LOGGER.debug("Ignoring duplicate fire for %s", self.entity_id)
            return
        self.hass.bus.async_fire(
            EVENT_ON_FIRE,
            {
                EVENT_ATTR_DEVICE_ID: self.device_id,
                EVENT_ATTR_ENTITY_ID: self.entity_id,
                EVENT_ATTR_TIMER_NAME: self._attr_name,
                EVENT_ATTR_TOTAL_SECONDS: int(round(self._engine.total)),
            },
        )
        self.hass.async_create_task(self._play_sound())

    async def _fire(self) -> None:
        self.fire()

    def _sound_content(self) -> str | None:
        """URL or path to play. Bundled kitchen timer is the default."""
        opts = self._options()
        source = opts.get(CONF_SOUND_SOURCE)
        custom = opts.get(CONF_SOUND_URL) or opts.get(CONF_SOUND_PATH)
        if source == SOUND_NONE:
            return None
        if source == SOUND_CUSTOM:
            return custom or None
        # Explicit default, or an older entry with no custom file.
        if source == SOUND_DEFAULT or not custom:
            return self.hass.data.get(DOMAIN, {}).get("default_sound_url")
        return custom

    async def _play_sound(self) -> None:
        opts = self._options()
        player = opts.get(CONF_MEDIA_PLAYER)
        content = self._sound_content()
        volume = opts.get(CONF_SOUND_VOLUME, DEFAULT_SOUND_VOLUME)
        try:
            if player and volume is not None:
                await self.hass.services.async_call(
                    "media_player",
                    "volume_set",
                    {
                        "entity_id": player,
                        "volume_level": max(0.0, min(100.0, float(volume))) / 100.0,
                    },
                    blocking=False,
                )
            if player and content:
                await self.hass.services.async_call(
                    "media_player",
                    "play_media",
                    {
                        "entity_id": player,
                        "media_content_id": content,
                        "media_content_type": "music",
                    },
                    blocking=False,
                )
            elif player:
                await self.hass.services.async_call(
                    "media_player",
                    "media_play",
                    {"entity_id": player},
                    blocking=False,
                )
            elif content:
                _LOGGER.warning(
                    "Smart Timer %s has a sound file but no media player; "
                    "event was fired, sound was not played",
                    self.entity_id,
                )
        except Exception:  # noqa: BLE001 - sound must never block the event
            _LOGGER.exception("Failed to play Smart Timer sound")

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    async def async_added_to_hass(self) -> None:
        """Restore remaining time after a restart. Never auto-resume."""
        await super().async_added_to_hass()
        self.hass.data.setdefault(DOMAIN, {})[self.entity_id] = self
        self._engine.set_default(self._configured_default())
        last = await self.async_get_last_state()
        if last is None:
            self._engine.remaining = self._engine.default
            self._engine.total = self._engine.default
        else:
            attrs = last.attributes or {}
            try:
                remaining = float(attrs.get(ATTR_REMAINING_SECONDS, self._engine.remaining))
            except (TypeError, ValueError):
                remaining = self._engine.remaining
            try:
                total = float(attrs.get(ATTR_TOTAL_SECONDS, self._engine.total))
            except (TypeError, ValueError):
                total = self._engine.total
            self._engine.restore(
                remaining=remaining,
                total=total,
                state=str(attrs.get(ATTR_TIMER_STATE, "idle")),
                default=self._configured_default(),
            )
        self._publish()

    async def async_will_remove_from_hass(self) -> None:
        """Stop the ticker when the entity is removed."""
        self._unschedule_tick()
        self.hass.data.get(DOMAIN, {}).pop(self.entity_id, None)
        await super().async_will_remove_from_hass()
