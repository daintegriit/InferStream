"""
backend/features/build_online_store.py

Replay the event log once and write the online store: one row per entity,
holding the feature value AS OF a single instant.

Why a single as-of instant matters
----------------------------------
The obvious shortcut is to replay everything and keep whatever is left in
each user's sliding window. That is wrong. A user whose last event was in
March has a window anchored to March; a user active last week has one
anchored to last week. Reading those side by side compares values computed
at different moments -- the same mistake as point-in-time leakage, wearing
different clothes.

So: pick one AS_OF (the end of the log), and evaluate every user there.
Most users will be 0, because most users were not active in the final week.
That is the correct answer, not a bug.

We also store last_event_ts so freshness is MEASURED (now - last write)
rather than declared as a constant.

Run from repo root:  python backend/features/build_online_store.py
"""

from __future__ import annotations

from collections import defaultdict, deque
from pathlib import Path

import pandas as pd

DATA = Path("data/ml-32m/ratings_recent.parquet")
OUT_DIR = Path("backend/artifacts/feature_store")
OUT = OUT_DIR / "user_rating_count_7d.parquet"

WINDOW_SECONDS = 7 * 24 * 3600
FEATURE_NAME = "user_rating_count_7d"


def main() -> int:
    if not DATA.exists():
        print(f"Missing {DATA}")
        return 1

    print(f"Loading {DATA}")
    events = pd.read_parquet(DATA)[["userId", "timestamp"]]
    events = events.sort_values("timestamp", kind="mergesort").reset_index(drop=True)

    as_of = int(events["timestamp"].max())
    cutoff = as_of - WINDOW_SECONDS
    print(f"  {len(events):,} events, {events.userId.nunique():,} users")
    print(f"  as_of = {as_of} ({pd.to_datetime(as_of, unit='s')})")

    # Single pass, same semantics as the streaming consumer.
    windows: dict[int, deque[int]] = defaultdict(deque)
    last_seen: dict[int, int] = {}

    for user, ts in zip(events["userId"].to_numpy(), events["timestamp"].to_numpy()):
        user, ts = int(user), int(ts)
        dq = windows[user]
        while dq and dq[0] < ts - WINDOW_SECONDS:
            dq.popleft()
        dq.append(ts)
        last_seen[user] = ts

    # Evaluate every user at the SAME instant, not at their own last event.
    rows = []
    for user, dq in windows.items():
        value = sum(1 for ts in dq if cutoff <= ts < as_of)
        rows.append(
            {
                "entity": "user",
                "entity_id": user,
                "feature": FEATURE_NAME,
                "value": value,
                "last_event_ts": last_seen[user],
                "as_of": as_of,
            }
        )

    store = pd.DataFrame(rows).sort_values("entity_id").reset_index(drop=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    store.to_parquet(OUT, index=False)

    nonzero = int((store.value > 0).sum())
    print(f"\nWrote {OUT}")
    print(f"  {len(store):,} entities")
    print(f"  {nonzero:,} nonzero ({nonzero / len(store):.1%} active in the final 7 days)")
    print(f"  max value: {store.value.max()}")
    print(
        "  staleness p50: "
        f"{pd.to_timedelta(int((as_of - store.last_event_ts).median()), unit='s')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())