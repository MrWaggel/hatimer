"""Edge-case tests for the Smart Timer countdown engine."""

from __future__ import annotations

import importlib.util
from pathlib import Path

_ENGINE = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "smart_timer"
    / "timer_engine.py"
)
_spec = importlib.util.spec_from_file_location("timer_engine", _ENGINE)
assert _spec and _spec.loader
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

MAX_SECONDS = _mod.MAX_SECONDS
STATE_FINISHED = _mod.STATE_FINISHED
STATE_IDLE = _mod.STATE_IDLE
STATE_PAUSED = _mod.STATE_PAUSED
STATE_RUNNING = _mod.STATE_RUNNING
TimerEngine = _mod.TimerEngine
format_seconds = _mod.format_seconds


def test_format_is_strict_hms_and_never_negative():
    assert format_seconds(0) == "00:00:00"
    assert format_seconds(-15) == "00:00:00"
    assert format_seconds(10) == "00:00:10"
    assert format_seconds(61) == "00:01:01"
    assert format_seconds(3661) == "01:01:01"
    assert format_seconds(MAX_SECONDS) == "24:00:00"
    assert format_seconds(MAX_SECONDS + 500) == "24:00:00"


def test_add_starts_and_clamps():
    engine = TimerEngine(0)
    engine.add_time(10, now=0)
    assert engine.state == STATE_RUNNING
    assert engine.remaining == 10
    engine.add_time(-50, now=1)  # negative adds are ignored
    engine.sync(now=1)
    assert engine.remaining == 9
    engine.add_time(MAX_SECONDS, now=1)
    assert engine.remaining == MAX_SECONDS


def test_rapid_adds_are_accurate():
    engine = TimerEngine(0)
    now = 1000.0
    for _ in range(5):
        engine.add_time(10, now)
        now += 0.05  # clicks faster than the 1s tick
    engine.sync(now)
    # 50s added, ~0.2s elapsed across the clicks.
    assert 49.5 < engine.remaining <= 50
    assert engine.state == STATE_RUNNING


def test_pause_freezes_exact_remaining():
    engine = TimerEngine(100)
    engine.start(now=0)
    engine.pause(now=40.4)
    assert engine.state == STATE_PAUSED
    assert abs(engine.remaining - 59.6) < 0.001
    engine.tick(now=80)  # paused timers do not tick down
    assert abs(engine.remaining - 59.6) < 0.001


def test_tick_hits_zero_once_and_stays_non_negative():
    engine = TimerEngine(2)
    engine.start(now=0)
    assert engine.tick(now=1) is False
    assert engine.tick(now=2.2) is True
    assert engine.state == STATE_FINISHED
    assert engine.remaining == 0
    assert engine.tick(now=9) is False
    assert engine.remaining == 0


def test_triple_path_reset_and_restart():
    engine = TimerEngine(30)
    engine.add_time(10, now=0)
    engine.reset()
    assert engine.state == STATE_IDLE
    assert engine.remaining == engine.total
    engine.start(now=5)
    assert engine.state == STATE_RUNNING


def test_finished_start_restarts_from_total():
    engine = TimerEngine(15)
    engine.start(now=0)
    assert engine.tick(now=15) is True
    engine.start(now=20)
    assert engine.state == STATE_RUNNING
    assert engine.remaining == 15


def test_fire_dedupes_card_and_ticker():
    engine = TimerEngine(1)
    engine.start(now=0)
    assert engine.tick(now=1) is True
    assert engine.should_fire(now=1.0) is True
    assert engine.should_fire(now=1.4) is False  # card's follow-up call
    assert engine.should_fire(now=4.0) is True  # later manual fire


def test_restore_running_becomes_paused():
    engine = TimerEngine(300)
    engine.restore(remaining=42, total=300, state=STATE_RUNNING)
    assert engine.state == STATE_PAUSED
    assert engine.remaining == 42
    engine.restore(remaining=0, total=300, state=STATE_FINISHED)
    assert engine.state == STATE_FINISHED
    assert engine.remaining == 0


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
    print("all engine tests passed")
