"""Tiny in-memory limiter for failed login attempts.

Per-process only: it resets on restart and is not shared between workers. It slows
down password guessing in development; a production deployment should add a shared
store (for example Redis) or rely on an API gateway.
"""

import threading
import time
from collections import defaultdict, deque

from app.core.exceptions import TooManyRequestsException

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60


class LoginThrottle:
    def __init__(self, max_failures: int = MAX_FAILURES, window_seconds: int = WINDOW_SECONDS) -> None:
        self._max = max_failures
        self._window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._failures[key]
        while attempts and now - attempts[0] > self._window:
            attempts.popleft()
        return attempts

    def check(self, key: str) -> None:
        """Raise if ``key`` already has too many recent failures."""
        now = time.monotonic()
        with self._lock:
            attempts = self._prune(key, now)
            if len(attempts) >= self._max:
                raise TooManyRequestsException(int(self._window - (now - attempts[0])) + 1)

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._failures.clear()
            else:
                self._failures.pop(key, None)


login_throttle = LoginThrottle()


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
        with self._lock:
            self._hits.clear()
