"""Smart Timer integration: config entries, services, and the dashboard card."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.network import get_url
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import (
    ATTR_MINUTES,
    ATTR_SECONDS,
    ALARM_STATIC_URL,
    CARD_URL,
    DEFAULT_SOUND_FILE,
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
    """Set up one Smart Timer device."""
    hass.data.setdefault(DOMAIN, {})
    await _async_register_card(hass)
    _install_default_sound(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_update_listener))

    if not hass.data[DOMAIN].get("services_registered"):
        _register_services(hass)
        hass.data[DOMAIN]["services_registered"] = True
    return True


async def async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Apply a new default duration without reloading a running countdown."""
    for entity in hass.data.get(DOMAIN, {}).values():
        if getattr(getattr(entity, "entry", None), "entry_id", None) != entry.entry_id:
            continue
        entity.apply_configured_default()
        entity.async_write_ha_state()


def _install_default_sound(hass: HomeAssistant) -> None:
    """Copy the bundled alarm into /config/www so media players can fetch it.

    The sound is the default, not a requirement. A timer with sound source
    "none", or with its own URL/path, does not play this file.
    """
    src = Path(__file__).parent / "sounds" / DEFAULT_SOUND_FILE
    if not src.is_file():
        _LOGGER.warning("Bundled kitchen timer sound missing at %s", src)
        return
    dest_dir = Path(hass.config.path("www", "smart_timer"))
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / DEFAULT_SOUND_FILE
    if not dest.exists() or dest.stat().st_size != src.stat().st_size:
        shutil.copyfile(src, dest)
    try:
        base = get_url(hass).rstrip("/")
    except Exception:  # noqa: BLE001 - fall back to a relative URL
        _LOGGER.debug("Could not resolve Home Assistant URL for the default sound")
        base = ""
    hass.data[DOMAIN]["default_sound_url"] = f"{base}/local/smart_timer/{DEFAULT_SOUND_FILE}"


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Smart Timer config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        registry = hass.data.get(DOMAIN, {})
        stale = [
            entity_id
            for entity_id, entity in registry.items()
            if getattr(getattr(entity, "entry", None), "entry_id", None) == entry.entry_id
        ]
        for entity_id in stale:
            registry.pop(entity_id, None)
    return unload_ok


async def _async_register_card(hass: HomeAssistant) -> None:
    """Serve the Lovelace card and load it with the frontend.

    Marketplace installs this repository as an integration, so the card has to
    ship inside the integration and register itself. Otherwise the dashboard
    resource is never added.
    """
    if hass.data[DOMAIN].get("card_registered"):
        return
    paths: list[StaticPathConfig] = []
    card_path = Path(__file__).parent / "www" / "smart-timer-card.js"
    sound_path = Path(__file__).parent / "sounds" / DEFAULT_SOUND_FILE
    if card_path.is_file():
        paths.append(StaticPathConfig(CARD_URL, str(card_path), cache_headers=False))
    else:
        _LOGGER.warning("Smart Timer card bundle missing at %s", card_path)
    if sound_path.is_file():
        # Browser and companion app play this directly. No media player required.
        paths.append(StaticPathConfig(ALARM_STATIC_URL, str(sound_path), cache_headers=True))
    else:
        _LOGGER.warning("Bundled kitchen timer sound missing at %s", sound_path)
    if paths:
        await hass.http.async_register_static_paths(paths)
    if card_path.is_file():
        add_extra_js_url(hass, CARD_URL)
    hass.data[DOMAIN]["card_registered"] = True
    _LOGGER.debug("Registered Smart Timer card at %s", CARD_URL)


def _target_entities(hass: HomeAssistant, call: ServiceCall) -> list:
    """Resolve entity_id and device_id targets to live timer sensors."""
    targets: list[str] = []
    raw_entities = call.data.get("entity_id") or []
    if isinstance(raw_entities, str):
        raw_entities = [raw_entities]
    targets.extend(raw_entities)

    raw_devices = call.data.get("device_id") or []
    if isinstance(raw_devices, str):
        raw_devices = [raw_devices]
    if raw_devices:
        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)
        for device_id in raw_devices:
            if dev_reg.async_get(device_id) is None:
                continue
            for ent in er.async_entries_for_device(ent_reg, device_id):
                if ent.platform == DOMAIN:
                    targets.append(ent.entity_id)

    if not targets:
        raise ValueError("Service requires a Smart Timer entity or device target.")

    # A device target is sometimes expanded to entity_id as well; act once.
    targets = list(dict.fromkeys(targets))

    registry = hass.data.get(DOMAIN, {})
    resolved = []
    for raw in targets:
        entity_id = er.async_validate_entity_id(hass, raw)
        entity = registry.get(entity_id)
        if entity is None:
            raise ValueError(f"Unknown Smart Timer entity {entity_id}")
        resolved.append(entity)
    return resolved


def _number_or(data: dict, key: str, default: float = 0.0) -> float:
    try:
        return float(data.get(key, default))
    except (TypeError, ValueError):
        return default


def _register_services(hass: HomeAssistant) -> None:
    """Register domain services once."""

    async def handle_add_time(call: ServiceCall) -> None:
        seconds = max(0.0, _number_or(call.data, ATTR_SECONDS))
        seconds += max(0.0, _number_or(call.data, ATTR_MINUTES)) * 60
        for entity in _target_entities(hass, call):
            entity.add_time(seconds)

    async def handle_set_time(call: ServiceCall) -> None:
        seconds = max(0.0, _number_or(call.data, ATTR_SECONDS))
        seconds += max(0.0, _number_or(call.data, ATTR_MINUTES)) * 60
        for entity in _target_entities(hass, call):
            entity.set_time(seconds)

    async def handle_start(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.start()

    async def handle_pause(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.pause()

    async def handle_resume(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.resume()

    async def handle_toggle(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.toggle()

    async def handle_reset(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.reset()

    async def handle_fire(call: ServiceCall) -> None:
        for entity in _target_entities(hass, call):
            entity.fire()

    async def handle_set_sound(call: ServiceCall) -> None:
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
