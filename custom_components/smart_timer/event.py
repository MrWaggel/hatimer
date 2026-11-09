"""Event entity fired when a Smart Timer reaches zero."""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity import DeviceInfo

from .const import (
    DOMAIN,
    EVENT_ATTR_DEVICE_ID,
    EVENT_ATTR_ENTITY_ID,
    EVENT_ATTR_ENTRY_ID,
    EVENT_ATTR_TIMER_NAME,
    EVENT_ATTR_TOTAL_SECONDS,
    EVENT_ON_FIRE,
    EVENT_TYPE_FINISHED,
    VERSION,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities,
) -> None:
    """Add the finished-event entity for this timer device."""
    async_add_entities([SmartTimerFinishedEvent(entry)])


class SmartTimerFinishedEvent(EventEntity):
    """Device event that automations can subscribe to."""

    _attr_event_types = [EVENT_TYPE_FINISHED]
    _attr_has_entity_name = True
    _attr_name = "Finished"
    _attr_translation_key = "finished"
    _attr_icon = "mdi:bell-ring-outline"

    def __init__(self, entry: ConfigEntry) -> None:
        self._entry_id = entry.entry_id
        name = entry.data.get("name", "Smart Timer")
        self._attr_unique_id = f"{entry.entry_id}_finished"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=name,
            manufacturer="Smart Timer",
            model="Smart Timer",
            sw_version=VERSION,
        )

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_ON_FIRE, self._on_timer_fired)
        )

    @callback
    def _on_timer_fired(self, event: Event) -> None:
        """Mirror the timer's zero-crossing onto this event entity."""
        data = event.data
        if data.get(EVENT_ATTR_ENTRY_ID) != self._entry_id:
            if data.get(EVENT_ATTR_DEVICE_ID) != self.device_id:
                return
        self._trigger_event(
            EVENT_TYPE_FINISHED,
            {
                EVENT_ATTR_DEVICE_ID: data.get(EVENT_ATTR_DEVICE_ID),
                EVENT_ATTR_ENTITY_ID: data.get(EVENT_ATTR_ENTITY_ID),
                EVENT_ATTR_TIMER_NAME: data.get(EVENT_ATTR_TIMER_NAME),
                EVENT_ATTR_TOTAL_SECONDS: data.get(EVENT_ATTR_TOTAL_SECONDS),
            },
        )
        self.async_write_ha_state()

    @property
    def device_id(self) -> str | None:
        if self.registry_entry and self.registry_entry.device_id:
            return self.registry_entry.device_id
        return None
