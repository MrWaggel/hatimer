"""Sensor entity for the Smart Timer integration."""

from __future__ import annotations

import asyncio
import logging
import time

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import (
    device_registry as dr,
    entity_registry as er,
)
from homeassistant.helpers.entity import DeviceInfo

from .const import (
    ATTR_DEVICE_ID,
    ATTR_ENTITY_ID,
    ATTR_FORMATTED,
    ATTR_REMAINING_SECONDS,
    ATTR_SOUND,
    ATTR_TIMER_STATE,
    ATTR_TOTAL_SECONDS,
    DOMAIN,
    DEFAULT_INITIAL_SECONDS,
    EVENT_ATTR_DEVICE_ID,
    EVENT_ATTR_ENTITY_ID,
    EVENT_ATTR_TIMER_NAME,
    EVENT_ATTR_TOTAL_SECONDS,
    EVENT_ON_FIRE,
    MAX_SECONDS,
    STATE_FINISHED,
    STATE_IDLE,
    STATE_PAUSED,
    STATE_RUNNING,
    TICK_INTERVAL,
)

_LOGGER = logging.getLogger(__name__)


def format_seconds(seconds: float) -> str:
    """Format a number of seconds as a strict HH:MM:SS string."""
    seconds = max(0, int(round(seconds)))
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities,
) -> None:
    """Set up the Smart Timer sensor for a config entry.

    Duplicate creation is prevented by the entity `unique_id`, which is derived
    from the config entry id.
    """
    async_add_entities([SmartTimerSensor(hass, entry)], update_before_add=False)


class SmartTimerSensor(SensorEntity):
    """A configurable countdown timer exposed as a sensor."""

    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the sensor."""
        self.hass = hass
        self.entry = entry
        self._remaining = float(entry.options.get("initial_seconds", entry.data.get("initial_seconds", DEFAULT_INITIAL_SECONDS)))
        self._total = self._remaining
        self._timer_state = STATE_IDLE
        self._end_time: float | None = None  # time.monotonic() deadline
        self._tick_handle: asyncio.TimerHandle | None = None

        name = entry.data.get("name", "Smart Timer")
        self._attr_unique_id = f"{DOMAIN}_{entry.entry_id}"
        self._attr_has_entity_name = False
        self._attr_name = name
        self._attr_device_class = "duration"
        self._attr_native_unit_of_measurement = "s"
        self._attr_native_value = int(round(self._remaining))

        # Register a device in the device registry for this entry.
        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={(DOMAIN, entry.entry_id)},
            name=name,
            manufacturer="Smart Timer",
            model="Smart Timer Device",
            sw_version=entry.version,
        )
        self._attr_device_info = DeviceInfo(
            identifiers=device.identifiers,
            name=name,
            manufacturer="Smart Timer",
            model="Smart Timer Device",
        )

    # ------------------------------------------------------------------
    # State / attributes
    # ------------------------------------------------------------------
    @property
    def native_value(self) -> int:
        """Remaining time in whole seconds."""
        return int(round(self._remaining))

    @property
    def extra_state_attributes(self) -> dict:
        """Expose rich state for the card and automations."""
        return {
            ATTR_TIMER_STATE: self._timer_state,
            ATTR_REMAINING_SECONDS: int(round(self._remaining)),
            ATTR_TOTAL_SECONDS: int(round(self._total)),
            ATTR_FORMATTED: format_seconds(self._remaining),
            ATTR_SOUND: self.sound_summary,
            ATTR_DEVICE_ID: self.device_id,
            ATTR_ENTITY_ID: self.entity_id,
        }

    @property
    def device_id(self) -> str | None:
        """ID of the registered device entry."""
        if not self.device_info:
            return None
        return next(iter(self.device_info.get("identifiers", set())))[1] if self.device_info.get("identifiers") else None

    @property
    def sound_summary(self) -> str | None:
        """Human description of the configured sound."""
        opts = self.entry.options
        if opts.get("media_player"):
            return f"media_player:{opts['media_player']}"
        if opts.get("sound_url"):
            return opts["sound_url"]
        if opts.get("sound_path"):
            return opts["sound_path"]
        return None

    # ------------------------------------------------------------------
    # Tick scheduling
    # ------------------------------------------------------------------
    def _schedule_tick(self) -> None:
        """Schedule the next 1s tick while running."""
        if self._timer_state != STATE_RUNNING:
            return
        self._unschedule_tick()
        self._tick_handle = self.hass.loop.call_later(TICK_INTERVAL, self._tick)

    @callback
    def _tick(self) -> None:
        """Recompute remaining, tick DOWN, and stop at zero."""
        self._tick_handle = None
        if self._end_time is None:
            self._remaining = 0.0
            self._finish()
            self.async_write_ha_state()
            return

        now = time.monotonic()
        self._remaining = self._end_time - now
        if self._remaining <= 0:
            self._remaining = 0.0
            self._timer_state = STATE_FINISHED
            self._end_time = None
            self.async_write_ha_state()
            self.hass.async_create_task(self._fire())
            return

        self.async_write_ha_state()
        self._schedule_tick()

    # ------------------------------------------------------------------
    # Public operations (used by services + card buttons)
    # ------------------------------------------------------------------
    def start(self) -> None:
        """Start or resume a countdown from the current remaining value."""
        if self._remaining <= 0:
            # Nothing left to count; reset to the initial total instead.
            self._remaining = self._total
        self._end_time = time.monotonic() + self._remaining
        self._timer_state = STATE_RUNNING
        self._schedule_tick()

    def pause(self) -> None:
        """Pause the countdown, freezing remaining time."""
        if self._timer_state != STATE_RUNNING:
            return
        self._end_time = None
        self._timer_state = STATE_PAUSED
        self._unschedule_tick()

    def resume(self) -> None:
        """Resume a paused countdown."""
        if self._timer_state != STATE_PAUSED:
            return
        self.start()

    def toggle(self) -> None:
        """Pause if running, resume if paused/start if idle."""
        if self._timer_state == STATE_RUNNING:
            self.pause()
        else:
            self.resume() if self._timer_state == STATE_PAUSED else self.start()

    def reset(self) -> None:
        """Reset the countdown back to its initial total (idle)."""
        self._unschedule_tick()
        self._end_time = None
        self._timer_state = STATE_IDLE
        self._remaining = self._total

    def set_time(self, seconds: float) -> None:
        """Set an absolute remaining time; clamps and starts counting."""
        self._remaining = max(0.0, min(float(seconds), MAX_SECONDS))
        self._total = self._remaining
        self.start()

    def add_time(self, seconds: float) -> None:
        """Add seconds to the timer and immediately start/resume counting."""
        self._remaining = max(0.0, min(self._remaining + float(seconds), MAX_SECONDS))
        self._total = max(self._total, self._remaining)
        # Pressing an increment button always (re)starts the countdown.
        self.start()

    def set_sound(self, *, media_player=None, sound_url=None, sound_path=None, volume=None) -> None:
        """Update sound configuration at runtime."""
        opts = dict(self.entry.options)
        if media_player is not None:
            opts["media_player"] = media_player
        if sound_url is not None:
            opts["sound_url"] = sound_url
        if sound_path is not None:
            opts["sound_path"] = sound_path
        if volume is not None:
            opts["sound_volume"] = volume
        self.hass.config_entries.async_update_entry(self.entry, options=opts)
        self.async_write_ha_state()

    def fire(self) -> None:
        """Immediately fire the on-fire event and play the configured sound."""
        # Play the configured sound.
        opts = self.entry.options
        if opts.get("media_player"):
            self.hass.async_create_task(self._play_media_player(opts["media_player"]))
        else:
            content = opts.get("sound_url") or opts.get("sound_path")
            if content:
                self.hass.async_create_task(self._play_media(content))

        self.hass.bus.fire(
            EVENT_ON_FIRE,
            {
                EVENT_ATTR_DEVICE_ID: self.device_id,
                EVENT_ATTR_ENTITY_ID: self.entity_id,
                EVENT_ATTR_TIMER_NAME: self._attr_name,
                EVENT_ATTR_TOTAL_SECONDS: int(round(self._total)),
            },
        )

    async def _play_media_player(self, entity_id: str) -> None:
        """Play the configured sound via a media player entity."""
        data = {"entity_id": entity_id}
        content = self.entry.options.get("sound_url") or self.entry.options.get("sound_path")
        if content:
            data["media_content_id"] = content
            data["media_content_type"] = "audio/mp3"
        await self.hass.services.async_call("media_player", "play_media", data, blocking=True)

    async def _play_media(self, content: str) -> None:
        """Play a sound file / URL on the default media player."""
        await self.hass.services.async_call(
            "media_player",
            "play_media",
            {
                "media_content_id": content,
                "media_content_type": "audio/mp3",
            },
            blocking=False,
        )

    async def _fire(self) -> None:
        """Async completion handler fired when countdown reaches zero."""
        self.fire()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _unschedule_tick(self) -> None:
        if self._tick_handle is not None:
            self._tick_handle.cancel()
            self._tick_handle = None

    def _finish(self) -> None:
        self._timer_state = STATE_FINISHED
        self._end_time = None

    # ------------------------------------------------------------------
    # Lifecycle hooks
    # ------------------------------------------------------------------
    async def async_added_to_hass(self) -> None:
        """Restore any previously stored state after a Home Assistant reboot."""
        await super().async_added_to_hass()
        # Make this entity reachable by the domain services.
        self.hass.data.setdefault(DOMAIN, {})[self.entity_id] = self
        last = await self.async_get_last_state()
        if last is None:
            return
        try:
            remaining = float(last.attributes.get(ATTR_REMAINING_SECONDS, self._remaining))
        except (ValueError, TypeError):
            remaining = self._remaining
        self._remaining = max(0.0, remaining)
        stored_state = last.attributes.get(ATTR_TIMER_STATE, STATE_IDLE)
        # Never auto-resume across a reboot; restore to a paused/idle state.
        if stored_state in (STATE_RUNNING, STATE_PAUSED) and self._remaining > 0:
            self._timer_state = STATE_PAUSED
            self._end_time = None
        elif stored_state == STATE_FINISHED and self._remaining <= 0:
            self._timer_state = STATE_FINISHED
        self._total = max(self._total, self._remaining)

    async def async_will_remove_from_hass(self) -> None:
        """Clean up the ticker when the entity is removed."""
        self._unschedule_tick()
        self.hass.data.setdefault(DOMAIN, {}).pop(self.entity_id, None)
        await super().async_will_remove_from_hass()