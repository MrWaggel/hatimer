"""Config and options flows for the Smart Timer integration."""

from __future__ import annotations

import uuid

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_DEFAULT_SECONDS,
    CONF_INITIAL_SECONDS,
    CONF_MEDIA_PLAYER,
    CONF_SOUND_PATH,
    CONF_SOUND_SOURCE,
    CONF_SOUND_URL,
    CONF_SOUND_VOLUME,
    CONF_TIMER_NAME,
    DEFAULT_INITIAL_SECONDS,
    DEFAULT_SOUND_VOLUME,
    DOMAIN,
    MAX_SECONDS,
    SOUND_CUSTOM,
    SOUND_DEFAULT,
    SOUND_NONE,
)


def _seconds_selector() -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=0,
            max=MAX_SECONDS,
            step=1,
            mode=selector.NumberSelectorMode.BOX,
            unit_of_measurement="seconds",
        )
    )


def _media_player_selector() -> selector.EntitySelector:
    return selector.EntitySelector(
        selector.EntitySelectorConfig(domain="media_player")
    )


def _volume_selector() -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=0,
            max=100,
            step=1,
            unit_of_measurement="%",
        )
    )


class SmartTimerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Smart Timer."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> SmartTimerOptionsFlow:
        """Return the options flow. ``config_entry`` is injected by Home Assistant."""
        return SmartTimerOptionsFlow()

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        """Create a new timer. Users can add as many as they want."""
        errors: dict[str, str] = {}

        if user_input is not None:
            name = str(user_input.get(CONF_TIMER_NAME, "")).strip()
            if not name:
                errors["base"] = "name_required"
            else:
                # Unique per instance, not per name, so duplicates are allowed.
                await self.async_set_unique_id(uuid.uuid4().hex)
                default_seconds = int(
                    user_input.get(CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS)
                )
                return self.async_create_entry(
                    title=name,
                    data={
                        CONF_TIMER_NAME: name,
                        CONF_INITIAL_SECONDS: default_seconds,
                    },
                    options={
                        CONF_DEFAULT_SECONDS: default_seconds,
                        CONF_SOUND_SOURCE: SOUND_DEFAULT,
                        CONF_SOUND_VOLUME: DEFAULT_SOUND_VOLUME,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_TIMER_NAME): selector.TextSelector(),
                    vol.Required(
                        CONF_INITIAL_SECONDS,
                        default=DEFAULT_INITIAL_SECONDS,
                    ): _seconds_selector(),
                }
            ),
            errors=errors,
            description_placeholders={"max": str(MAX_SECONDS)},
        )


class SmartTimerOptionsFlow(config_entries.OptionsFlow):
    """Configure the sound played when a timer hits zero."""

    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        if user_input is not None:
            sound_url = str(user_input.get(CONF_SOUND_URL) or "").strip()
            sound_path = str(user_input.get(CONF_SOUND_PATH) or "").strip()
            default_seconds = int(
                user_input.get(
                    CONF_DEFAULT_SECONDS,
                    self.config_entry.data.get(
                        CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS
                    ),
                )
            )
            return self.async_create_entry(
                title="",
                data={
                    CONF_DEFAULT_SECONDS: default_seconds,
                    CONF_MEDIA_PLAYER: user_input.get(CONF_MEDIA_PLAYER) or None,
                    CONF_SOUND_SOURCE: user_input.get(CONF_SOUND_SOURCE, SOUND_DEFAULT),
                    CONF_SOUND_URL: sound_url or None,
                    CONF_SOUND_PATH: sound_path or None,
                    CONF_SOUND_VOLUME: user_input.get(
                        CONF_SOUND_VOLUME, DEFAULT_SOUND_VOLUME
                    ),
                },
            )

        current = self.config_entry.options
        current_default = current.get(
            CONF_DEFAULT_SECONDS,
            self.config_entry.data.get(CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS),
        )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_DEFAULT_SECONDS,
                        default=int(current_default),
                    ): _seconds_selector(),
                    vol.Required(
                        CONF_SOUND_SOURCE,
                        default=current.get(CONF_SOUND_SOURCE, SOUND_DEFAULT),
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[
                                {
                                    "value": SOUND_DEFAULT,
                                    "label": "Bundled kitchen timer",
                                },
                                {
                                    "value": SOUND_CUSTOM,
                                    "label": "Custom URL or file",
                                },
                                {"value": SOUND_NONE, "label": "No sound"},
                            ],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                    vol.Optional(
                        CONF_MEDIA_PLAYER,
                        description={"suggested_value": current.get(CONF_MEDIA_PLAYER)},
                    ): _media_player_selector(),
                    vol.Optional(
                        CONF_SOUND_URL,
                        description={"suggested_value": current.get(CONF_SOUND_URL) or ""},
                    ): selector.TextSelector(),
                    vol.Optional(
                        CONF_SOUND_PATH,
                        description={"suggested_value": current.get(CONF_SOUND_PATH) or ""},
                    ): selector.TextSelector(),
                    vol.Optional(
                        CONF_SOUND_VOLUME,
                        default=current.get(CONF_SOUND_VOLUME, DEFAULT_SOUND_VOLUME),
                    ): _volume_selector(),
                }
            ),
        )
