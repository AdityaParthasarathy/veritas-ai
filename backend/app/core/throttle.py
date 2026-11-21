"""Tiny in-memory request limiter.

Per-process only: it resets when an instance restarts and is not shared between instances. On a serverless host each
instance has its own counter, so this slows a single client down but is not a strict global limit.
"""

import threading
import time
from collections import defaultdict, deque

from app.core.exceptions import TooManyRequestsException

class RateLimiter:
    """Sliding-window request limiter (in memory, per process; see module note)."""

    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self._max = max_requests
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str) -> None:
        """Record a request for ``key`` or raise TooManyRequestsException."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self._window:
                hits.popleft()
            if len(hits) >= self._max:
                raise TooManyRequestsException(int(self._window - (now - hits[0])) + 1)
            hits.append(now)

    def reset(self) -> None:
        """Forget all recorded requests."""
        with self._lock:
            self._hits.clear()
