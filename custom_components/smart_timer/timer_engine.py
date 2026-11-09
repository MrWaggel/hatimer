"""Pure countdown engine. No Home Assistant imports, so it can be unit-tested."""

from __future__ import annotations

MAX_SECONDS = 24 * 60 * 60

STATE_IDLE = "idle"
STATE_RUNNING = "running"
STATE_PAUSED = "paused"
STATE_FINISHED = "finished"

# Ignore a second fire that arrives within this window (card + ticker).
FIRE_DEDUPE_SECONDS = 2.0


def clamp_seconds(seconds: float) -> float:
    """Clamp a duration into ``[0, MAX_SECONDS]``."""
    try:
        value = float(seconds)
    except (TypeError, ValueError):
        return 0.0
    if value != value:  # NaN
        return 0.0
    return max(0.0, min(value, MAX_SECONDS))


def format_seconds(seconds: float) -> str:
    """Format a number of seconds as a strict ``HH:MM:SS`` string."""
    whole = int(clamp_seconds(round(seconds)))
    hours, rem = divmod(whole, 3600)
    minutes, secs = divmod(rem, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


class TimerEngine:
    """Countdown state machine driven by a caller-supplied monotonic clock."""

    def __init__(self, default: float) -> None:
        self.default = clamp_seconds(default if default else 0)
        self.total = self.default
        self.remaining = self.default
        self.state = STATE_IDLE
        self._end: float | None = None
        self._last_fire_at: float | None = None

    def set_default(self, seconds: float) -> None:
        """Change the configured reset value. Does not touch a running countdown."""
        self.default = clamp_seconds(seconds)

    def sync(self, now: float) -> None:
        """Recompute remaining from the deadline. Never goes negative."""
        if self.state == STATE_RUNNING and self._end is not None:
            self.remaining = clamp_seconds(self._end - now)

    def start(self, now: float) -> None:
        """Start or resume from the current remaining value.

        A finished timer restarts from the configured default. A default of 0
        stays idle instead of immediately finishing and firing.
        """
        if self.remaining <= 0:
            self.remaining = self.default
        self.remaining = clamp_seconds(self.remaining)
        if self.remaining <= 0:
            self._end = None
            self.state = STATE_IDLE
            return
        self._end = now + self.remaining
        self.state = STATE_RUNNING
        # A new run may complete immediately; don't suppress that fire.
        self._last_fire_at = None

    def pause(self, now: float) -> None:
        """Freeze remaining time. No-op unless the timer is running."""
        if self.state != STATE_RUNNING:
            return
        self.sync(now)
        self._end = None
        self.state = STATE_PAUSED

    def toggle(self, now: float) -> None:
        """Pause if running, otherwise start (from idle, paused, or finished)."""
        if self.state == STATE_RUNNING:
            self.pause(now)
        else:
            self.start(now)

    def reset(self) -> None:
        """Return to the configured default duration and idle.

        Added time is discarded. The default itself is never changed by
        ``add_time`` or ``set_time``.
        """
        self._end = None
        self.state = STATE_IDLE
        self.remaining = self.default
        self.total = self.default
        self._last_fire_at = None

    def set_time(self, seconds: float, now: float) -> None:
        """Set an absolute remaining time and start counting."""
        self.remaining = clamp_seconds(seconds)
        self.total = self.remaining
        self.start(now)

    def add_time(self, seconds: float, now: float) -> None:
        """Add time (ignored if negative) and immediately start or resume."""
        self.sync(now)
        added = clamp_seconds(seconds)
        self.remaining = clamp_seconds(self.remaining + added)
        self.total = max(self.total, self.remaining)
        self.start(now)

    def tick(self, now: float) -> bool:
        """Advance a running timer. Return True exactly once when it hits zero."""
        if self.state != STATE_RUNNING or self._end is None:
            return False
        self.remaining = self._end - now
        if self.remaining > 0:
            return False
        self.remaining = 0.0
        self.state = STATE_FINISHED
        self._end = None
        return True

    def should_fire(self, now: float) -> bool:
        """True if a fire should be emitted now (suppresses duplicates)."""
        if (
            self._last_fire_at is not None
            and now - self._last_fire_at < FIRE_DEDUPE_SECONDS
        ):
            return False
        self._last_fire_at = now
        return True

    def restore(
        self,
        *,
        remaining: float,
        total: float,
        state: str,
        default: float | None = None,
    ) -> None:
        """Restore after a restart. A running timer comes back paused.

        ``default`` is the configured reset value and is not replaced by the
        remaining time of the run that was in progress.
        """
        if default is not None:
            self.default = clamp_seconds(default)
        self.total = clamp_seconds(total if total else self.default)
        self.remaining = clamp_seconds(remaining)
        self._end = None
        self._last_fire_at = None
        if state in (STATE_RUNNING, STATE_PAUSED) and self.remaining > 0:
            self.state = STATE_PAUSED
        elif state == STATE_FINISHED and self.remaining <= 0:
            self.state = STATE_FINISHED
        else:
            self.state = STATE_IDLE
