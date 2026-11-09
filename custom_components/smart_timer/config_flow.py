"""Config and options flows for the Smart Timer integration."""

from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_INITIAL_SECONDS,
    CONF_MEDIA_PLAYER,
    CONF_SOUND_PATH,
    CONF_SOUND_URL,
    CONF_SOUND_VOLUME,
    CONF_TIMER_NAME,
    DEFAULT_INITIAL_SECONDS,
    DEFAULT_SOUND_VOLUME,
    DOMAIN,
    MAX_SECONDS,
)


def _name_selector() -> selector.SelectSelector:
    return selector.TextSelector()


def _seconds_selector() -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=1,
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
        selector.NumberSelectorConfig(min=0, max=100, step=1, unit_of_measurement="%")
    )


class SmartTimerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Smart Timer."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict | None = None
    ) -> FlowResult:
        """Handle the initial step to create a new timer instance."""
        errors: dict[str, str] = {}

        if user_input is not None:
            name = user_input.get(CONF_TIMER_NAME, "").strip()
            if not name:
                errors["base"] = "name_required"
            else:
                # Each instance is uniquely identified by its chosen name.
                await self.async_set_unique_id(name.lower().replace(" ", "_"))
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title=name,
                    data={
                        CONF_TIMER_NAME: name,
                        CONF_INITIAL_SECONDS: user_input.get(
                            CONF_INITIAL_SECONDS, DEFAULT_INITIAL_SECONDS
                        ),
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_TIMER_NAME, default=""): _name_selector(),
                    vol.Optional(
                        CONF_INITIAL_SECONDS,
                        default=DEFAULT_INITIAL_SECONDS,
                    ): _seconds_selector(),
                }
            ),
            errors=errors,
            description_placeholders={"max": str(MAX_SECONDS)},
        )


class SmartTimerOptionsFlow(config_entries.OptionsFlow):
    """Handle an options flow for an existing Smart Timer."""

    def __init__(self, entry: ConfigEntry) -> None:
        self.entry = entry

    async def async_step_init(
        self, user_input: dict | None = None
    ) -> FlowResult:
        if user_input is not None:
            media_player = user_input.get(CONF_MEDIA_PLAYER)
            sound_url = user_input.get(CONF_SOUND_URL, "").strip()
            sound_path = user_input.get(CONF_SOUND_PATH, "").strip()

            options = {
                CONF_MEDIA_PLAYER: media_player,
                CONF_SOUND_URL: sound_url or None,
                CONF_SOUND_PATH: sound_path or None,
                CONF_SOUND_VOLUME: user_input.get(
                    CONF_SOUND_VOLUME, DEFAULT_SOUND_VOLUME
                ),
            }
            return self.async_create_entry(title="", data=options)

        current = self.entry.options
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_MEDIA_PLAYER,
                        default=current.get(CONF_MEDIA_PLAYER),
                    ): _media_player_selector(),
                    vol.Optional(
                        CONF_SOUND_URL,
                        default=current.get(CONF_SOUND_URL, ""),
                    ): selector.TextSelector(
                        selector.TextSelectorConfig(
                            type=selector.TextSelectorType.URL,
                            placeholder="https://example.com/sound.mp3",
                        )
                    ),
                    vol.Optional(
                        CONF_SOUND_PATH,
                        default=current.get(CONF_SOUND_PATH, ""),
                    ): selector.TextSelector(
                        selector.TextSelectorConfig(
                            placeholder="/config/www/sound.mp3",
                        )
                    ),
                    vol.Optional(
                        CONF_SOUND_VOLUME,
                        default=current.get(CONF_SOUND_VOLUME, DEFAULT_SOUND_VOLUME),
                    ): _volume_selector(),
                }
            ),
            description_placeholders={"domain": DOMAIN},
        )


async def async_get_options_flow(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> SmartTimerOptionsFlow:
    """Return the options flow handler."""
    return SmartTimerOptionsFlow(entry)