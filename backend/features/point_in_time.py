"""
backend/features/point_in_time.py

One feature -- user_rating_count_7d -- computed two independent ways, plus a
test that they agree at sampled historical points.

THE SEMANTICS (this is the whole thing)

    value(user u, time t) = |{ events by u with  t - 7d <= ts < t }|

Three decisions are baked into that line, and each one is a bug if you get
it wrong:

  1. UPPER BOUND IS STRICT.  The event at t is NOT counted. If you are
     building a training row for the event at time t, including that event
     leaks the future into the feature. `<` not `<=`.

  2. LOWER BOUND IS INCLUSIVE.  An event exactly 7 days old is inside the
     window. Flip this and batch/stream disagree only on the rare exact
     boundary -- the worst kind of bug, because it passes casual testing.

  3. TIES SORT QUERIES BEFORE EVENTS.  When a user has several ratings at
     the identical timestamp and we query at that timestamp, none of them
     count. The stream must process the query before appending those events.

Run:  python -m features.point_in_time
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

DATA = Path("data/ml-32m/ratings_recent.parquet")
WINDOW_SECONDS = 7 * 24 * 3600
N_QUERIES = 1000
SEED = 42


# ============================================================
# Definition
# ============================================================
@dataclass(frozen=True)
class FeatureDefinition:
    """A feature defined once. Both execution paths read from this."""

    name: str
    entity: str
    window_seconds: int
    source: str
    description: str


USER_RATING_COUNT_7D = FeatureDefinition(
    name="user_rating_count_7d",
    entity="user",
    window_seconds=WINDOW_SECONDS,
    source="ml-32m.ratings",
    description="Ratings submitted by this user in the 7 days before the query instant.",
)


# ============================================================
# Path A -- batch backfill (offline / training)
# ============================================================
def backfill(events: pd.DataFrame, queries: pd.DataFrame, window: int) -> np.ndarray:
    """Vectorised as-of counts via binary search over each user's history.

    events must be sorted by timestamp so that per-user slices are ascending.
    """
    history = {
        uid: grp["timestamp"].to_numpy()
        for uid, grp in events.groupby("userId", sort=False)
    }

    users = queries["userId"].to_numpy()
    times = queries["timestamp"].to_numpy()
    out = np.zeros(len(queries), dtype=np.int64)

    for i in range(len(queries)):
        ts = history.get(users[i])
        if ts is None:
            continue
        # side="left" on both bounds gives  [t-window, t)
        hi = np.searchsorted(ts, times[i], side="left")
        lo = np.searchsorted(ts, times[i] - window, side="left")
        out[i] = hi - lo

    return out


# ============================================================
# Path B -- streaming consumer (online / inference)
# ============================================================
def stream(events: pd.DataFrame, queries: pd.DataFrame, window: int) -> np.ndarray:
    """Replay events in timestamp order, maintaining a sliding window per user.

    This is the shape a Kafka consumer would have: no random access, no
    lookahead, state held per entity key.
    """
    KIND_QUERY, KIND_EVENT = 0, 1  # sorts queries first on ties -- decision (3)

    timeline: list[tuple[int, int, int, int]] = []
    for idx, (u, t) in enumerate(zip(queries["userId"], queries["timestamp"])):
        timeline.append((int(t), KIND_QUERY, int(u), idx))
    for u, t in zip(events["userId"], events["timestamp"]):
        timeline.append((int(t), KIND_EVENT, int(u), -1))

    timeline.sort(key=lambda row: (row[0], row[1]))

    windows: dict[int, deque[int]] = defaultdict(deque)
    out = np.zeros(len(queries), dtype=np.int64)

    for t, kind, user, idx in timeline:
        dq = windows[user]
        cutoff = t - window
        while dq and dq[0] < cutoff:  # keep ts >= t-window -- decision (2)
            dq.popleft()

        if kind == KIND_QUERY:
            out[idx] = len(dq)
        else:
            dq.append(t)  # appended after, so event at t never counts -- decision (1)

    return out


# ============================================================
# The leaky version, for contrast
# ============================================================
def backfill_leaky(events: pd.DataFrame, queries: pd.DataFrame, window: int) -> np.ndarray:
    """Identical except the upper bound includes the query instant.

    This is the one-character mistake that inflates offline metrics and
    produces a model that collapses in production.
    """
    history = {
        uid: grp["timestamp"].to_numpy()
        for uid, grp in events.groupby("userId", sort=False)
    }
    users = queries["userId"].to_numpy()
    times = queries["timestamp"].to_numpy()
    out = np.zeros(len(queries), dtype=np.int64)

    for i in range(len(queries)):
        ts = history.get(users[i])
        if ts is None:
            continue
        hi = np.searchsorted(ts, times[i], side="right")  # <-- the bug
        lo = np.searchsorted(ts, times[i] - window, side="left")
        out[i] = hi - lo

    return out


# ============================================================
# Harness
# ============================================================
def timed(label: str, fn: Callable, *args) -> np.ndarray:
    start = time.perf_counter()
    result = fn(*args)
    print(f"  {label:22} {time.perf_counter() - start:6.2f}s")
    return result


def main() -> int:
    if not DATA.exists():
        print(f"Missing {DATA}. Build the slice first.")
        return 1

    print(f"Loading {DATA}")
    events = pd.read_parquet(DATA)[["userId", "timestamp"]]
    events = events.sort_values("timestamp", kind="mergesort").reset_index(drop=True)
    print(f"  {len(events):,} events, {events.userId.nunique():,} users\n")

    # Sample real (user, timestamp) pairs: exactly the training-set case --
    # "what did we know about this user immediately before this event?"
    queries = events.sample(N_QUERIES, random_state=SEED).reset_index(drop=True)

    print(f"Computing {USER_RATING_COUNT_7D.name} at {N_QUERIES:,} points")
    batch = timed("batch backfill", backfill, events, queries, WINDOW_SECONDS)
    online = timed("streaming replay", stream, events, queries, WINDOW_SECONDS)
    leaky = timed("leaky backfill", backfill_leaky, events, queries, WINDOW_SECONDS)

    mismatches = np.flatnonzero(batch != online)

    print("\n" + "=" * 58)
    print(f"PARITY: {len(queries) - len(mismatches):,}/{len(queries):,} agree")
    print("=" * 58)

    if len(mismatches):
        print(f"\n{len(mismatches)} MISMATCHES -- first 10:\n")
        for i in mismatches[:10]:
            print(
                f"  user={queries.userId[i]:>8}  t={queries.timestamp[i]}  "
                f"batch={batch[i]:>4}  stream={online[i]:>4}"
            )
        print("\nCheck the three boundary decisions in the module docstring.")
    else:
        print("\nBoth paths agree exactly.")

    print(f"\ndistribution: mean={batch.mean():.2f}  median={np.median(batch):.0f}  "
          f"max={batch.max()}  zeros={(batch == 0).sum()}")

    leaked = int((leaky != batch).sum())
    print(
        f"\nleaky variant differs on {leaked}/{len(queries)} rows "
        f"(+{(leaky - batch).sum()} phantom events from counting the query instant)"
    )

    return 0 if len(mismatches) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
