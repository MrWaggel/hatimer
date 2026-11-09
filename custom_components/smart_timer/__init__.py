"""Main module for the Smart Timer integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er

from .const import (
    ATTR_MINUTES,
    ATTR_SECONDS,
    DOMAIN,
    PLATFORMS,
    SERVICE_ADD_TIME,
    SERVICE_FIRE,
    SERVICE_PAUSE,
    SERVICE_RESET,
    SERVICE_RESUME,
    SERVICE_SET_SOUND,
    SERVICE_SET_TIME,
    SERVICE_START,
    SERVICE_TOGGLE,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Smart Timer from a config entry."""
    hass.data.setdefault(DOMAIN, {})  # entity registry shared by all services

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(async_update_listener))

    if not hass.data[DOMAIN].get("services_registered"):
        _register_services(hass)
        hass.data[DOMAIN]["services_registered"] = True

    return True


async def async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the integration when options change (e.g. a new sound)."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Smart Timer config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        # Clean up entity references associated with this entry.
        registry = hass.data.get(DOMAIN, {})
        to_remove = [eid for eid, ent in registry.items()
                     if getattr(ent, "entry", None) is not None
                     and ent.entry.entry_id == entry.entry_id]
        for eid in to_remove:
            registry.pop(eid, None)
    return unload_ok


def _target_entities(hass: HomeAssistant, call: ServiceCall) -> list:
    """Resolve target entities from a service call (entity_id targets)."""
    targets = call.data.get("entity_id")
    if not targets:
        raise ValueError("Service requires a target entity_id (smart_timer sensor).")
    if isinstance(targets, str):
        targets = [targets]

    registry = hass.data.get(DOMAIN, {})
    resolved = []
    for raw in targets:
        entity_id = er.async_validate_entity_id(hass, raw)
        entity = registry.get(entity_id)
        if entity is None:
            raise ValueError(
                f"Unknown Smart Timer entity {entity_id}. Load a Smart Timer "
                "card or wait for the sensor to register before calling services."
            )
        resolved.append(entity)
    return resolved


def _number_or(data: dict, key: str, default: float = 0.0) -> float:
    try:
        return float(data.get(key, default))
    except (TypeError, ValueError):
        return default


def _register_services(hass: HomeAssistant) -> None:
    """Register the domain-level services once."""

    # add_time / set_time support both seconds and minutes.
    async def handle_add_time(call: ServiceCall):
        seconds = _number_or(call.data, ATTR_SECONDS, 0.0)
        seconds += _number_or(call.data, ATTR_MINUTES, 0.0) * 60
        for entity in _target_entities(hass, call):
            entity.add_time(seconds)

    async def handle_set_time(call: ServiceCall):
        seconds = _number_or(call.data, ATTR_SECONDS, 0.0)
        seconds += _number_or(call.data, ATTR_MINUTES, 0.0) * 60
        for entity in _target_entities(hass, call):
            entity.set_time(seconds)

    async def handle_start(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.start()

    async def handle_pause(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.pause()

    async def handle_resume(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.resume()

    async def handle_toggle(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.toggle()

    async def handle_reset(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.reset()

    async def handle_fire(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.fire()

    async def handle_set_sound(call: ServiceCall):
        for entity in _target_entities(hass, call):
            entity.set_sound(
                media_player=call.data.get("media_player"),
                sound_url=call.data.get("sound_url"),
                sound_path=call.data.get("sound_path"),
                volume=call.data.get("sound_volume"),
            )

    services = {
        SERVICE_ADD_TIME: handle_add_time,
        SERVICE_SET_TIME: handle_set_time,
        SERVICE_START: handle_start,
        SERVICE_PAUSE: handle_pause,
        SERVICE_RESUME: handle_resume,
        SERVICE_TOGGLE: handle_toggle,
        SERVICE_RESET: handle_reset,
        SERVICE_FIRE: handle_fire,
        SERVICE_SET_SOUND: handle_set_sound,
    }
    for name, func in services.items():
        if not hass.services.has_service(DOMAIN, name):
            hass.services.async_register(DOMAIN, name, func)


def async_register_entity(hass: HomeAssistant, entity) -> None:
    """Add a live entity to the in-memory map used by services."""
    if entity.entity_id:
        hass.data.setdefault(DOMAIN, {})[entity.entity_id] = entity