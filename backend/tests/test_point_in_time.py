"""
backend/tests/test_point_in_time.py

Turns the parity harness into a standing guarantee.

point_in_time.py proves batch and stream agree on the day it is run. This
proves it on every commit, which is the difference between "I checked" and
"it cannot regress".

Run:  pytest backend/tests/ -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from features.point_in_time import (  # noqa: E402
    WINDOW_SECONDS,
    backfill,
    backfill_leaky,
    stream,
)

DATA = REPO_ROOT / "data" / "ml-32m" / "ratings_recent.parquet"

needs_data = pytest.mark.skipif(
    not DATA.exists(),
    reason=f"{DATA} not built. See README: Setup > Data.",
)


@pytest.fixture(scope="module")
def events() -> pd.DataFrame:
    df = pd.read_parquet(DATA)[["userId", "timestamp"]]
    return df.sort_values("timestamp", kind="mergesort").reset_index(drop=True)


@pytest.fixture(scope="module")
def queries(events: pd.DataFrame) -> pd.DataFrame:
    return events.sample(1000, random_state=42).reset_index(drop=True)


# ============================================================
# The headline claim
# ============================================================
@needs_data
def test_batch_and_stream_agree(events, queries):
    """The claim in the README: 1000/1000 parity."""
    batch = backfill(events, queries, WINDOW_SECONDS)
    online = stream(events, queries, WINDOW_SECONDS)

    mismatches = np.flatnonzero(batch != online)
    if len(mismatches):
        first = mismatches[0]
        pytest.fail(
            f"{len(mismatches)} of {len(queries)} disagree. First: "
            f"user={queries.userId[first]} t={queries.timestamp[first]} "
            f"batch={batch[first]} stream={online[first]}. "
            f"Check the three boundary decisions in point_in_time.py."
        )


@needs_data
def test_leaky_variant_still_leaks(events, queries):
    """Guards the guard: if this passes silently, the parity test proves nothing.

    An inclusive upper bound must differ from the correct one. If it stops
    differing, either the sample no longer contains simultaneous events or
    the two implementations have converged on the wrong semantics.
    """
    batch = backfill(events, queries, WINDOW_SECONDS)
    leaky = backfill_leaky(events, queries, WINDOW_SECONDS)

    phantom = int((leaky - batch).sum())
    assert phantom > 0, "Leaky variant no longer leaks -- the parity test is vacuous"
    assert (leaky >= batch).all(), "An inclusive bound can never count fewer events"


# ============================================================
# The three semantics decisions, tested directly
# ============================================================
def _frame(rows: list[tuple[int, int]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["userId", "timestamp"]).sort_values(
        "timestamp", kind="mergesort"
    ).reset_index(drop=True)


def test_upper_bound_is_strict():
    """The event at t must not count toward the feature at t."""
    events = _frame([(1, 100), (1, 200)])
    queries = _frame([(1, 200)])

    assert backfill(events, queries, 1000)[0] == 1
    assert stream(events, queries, 1000)[0] == 1


def test_lower_bound_is_inclusive():
    """An event exactly one window old is inside the window."""
    window = 100
    events = _frame([(1, 0)])
    queries = _frame([(1, 100)])  # exactly window seconds later

    assert backfill(events, queries, window)[0] == 1
    assert stream(events, queries, window)[0] == 1


def test_event_just_outside_window_excluded():
    window = 100
    events = _frame([(1, 0)])
    queries = _frame([(1, 101)])

    assert backfill(events, queries, window)[0] == 0
    assert stream(events, queries, window)[0] == 0


def test_ties_sort_queries_before_events():
    """Simultaneous events at the query instant must not count.

    This is the decision that dominates the leak: MovieLens sessions submit
    many ratings at one timestamp, so getting it wrong costs far more than
    one event per query.
    """
    events = _frame([(1, 50), (1, 100), (1, 100), (1, 100)])
    queries = _frame([(1, 100)])

    assert backfill(events, queries, 1000)[0] == 1
    assert stream(events, queries, 1000)[0] == 1


def test_unknown_entity_returns_zero():
    events = _frame([(1, 100)])
    queries = _frame([(999, 200)])

    assert backfill(events, queries, 1000)[0] == 0
    assert stream(events, queries, 1000)[0] == 0


def test_entities_do_not_bleed_into_each_other():
    events = _frame([(1, 100), (2, 110), (2, 120)])
    queries = _frame([(1, 200), (2, 200)])

    assert list(backfill(events, queries, 1000)) == [1, 2]
    assert list(stream(events, queries, 1000)) == [1, 2]