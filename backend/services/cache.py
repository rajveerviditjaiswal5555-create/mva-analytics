"""Tiny dependency-free, thread-safe TTL cache."""
from __future__ import annotations

import threading
import time
from typing import Any

_lock = threading.Lock()
# key -> (expires_at_monotonic, value)
_store: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    """Return the cached value, or None when the key is missing/expired."""
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            _store.pop(key, None)
            return None
        return value


def cache_set(key: str, value: Any, ttl_seconds: int = 30) -> None:
    """Store ``value`` under ``key`` for ``ttl_seconds`` seconds."""
    with _lock:
        _store[key] = (time.monotonic() + ttl_seconds, value)


def cache_clear(prefix: str | None = None) -> None:
    """Remove every entry, or only keys starting with ``prefix``."""
    with _lock:
        if prefix is None:
            _store.clear()
            return
        for key in [k for k in _store if k.startswith(prefix)]:
            _store.pop(key, None)


def cache_invalidate_all() -> None:
    """Invalidate every cached entry."""
    cache_clear()
