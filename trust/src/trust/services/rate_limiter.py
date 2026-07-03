from collections import deque
from datetime import datetime, timezone
from trust.models.check import Flag

_windows: dict[str, deque] = {}


def check_rate_limit(channel_id: str, rpm: int) -> list[Flag]:
    now = datetime.now(timezone.utc).timestamp()
    window = _windows.setdefault(channel_id, deque())
    # Remove entries older than 60 seconds
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= rpm:
        return [Flag(type="rate_limit", detail=f"exceeded {rpm} requests/minute", severity="block")]
    window.append(now)
    return []


def get_window_state(channel_id: str, rpm: int) -> dict:
    now = datetime.now(timezone.utc).timestamp()
    window = _windows.get(channel_id, deque())
    count = sum(1 for t in window if now - t <= 60)
    return {"channel_id": channel_id, "current_count": count, "limit": rpm, "window_seconds": 60}


def reset_for_testing(channel_id: str) -> None:
    _windows.pop(channel_id, None)
