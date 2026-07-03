import time
from collections import defaultdict, deque
from collections.abc import Callable

WINDOW_SECONDS = 60


class RateLimiter:
    def __init__(self, rpm: int, now_fn: Callable[[], float] = time.monotonic) -> None:
        self.rpm = rpm
        self._now_fn = now_fn
        self._windows: dict[str, deque] = defaultdict(deque)

    def _evict_expired(self, channel_id: str) -> None:
        window = self._windows[channel_id]
        cutoff = self._now_fn() - WINDOW_SECONDS
        while window and window[0] <= cutoff:
            window.popleft()

    def allow(self, channel_id: str) -> bool:
        self._evict_expired(channel_id)
        window = self._windows[channel_id]
        if len(window) >= self.rpm:
            return False
        window.append(self._now_fn())
        return True

    def get_state(self, channel_id: str) -> dict:
        self._evict_expired(channel_id)
        return {"count": len(self._windows[channel_id]), "limit": self.rpm}
