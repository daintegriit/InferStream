"""
backend/routers/features.py

Serves feature values BY ENTITY KEY from the online store built by
features/build_online_store.py.

This is the difference between serving a model and serving features: the
caller sends an entity id, not a vector. The platform already computed the
value and knows how stale it is.

Freshness is measured (now - last_event_ts), never declared.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()

_BACKEND = Path(__file__).resolve().parent.parent
STORE_DIR = Path(os.getenv("FEATURE_STORE_DIR", _BACKEND / "artifacts" / "feature_store"))


# ============================================================
# Registry
# ============================================================
FEATURE_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "user_rating_count_7d": {
        "name": "user_rating_count_7d",
        "entity": "user",
        "dtype": "numerical",
        "window_seconds": 7 * 24 * 3600,
        "source": "ml-32m.ratings",
        "description": "Ratings submitted by this user in the 7 days before the query instant.",
        "tags": ["user", "engagement", "windowed"],
        "point_in_time_verified": True,
    }
}


class FeatureTable:
    """One materialised feature: values keyed by entity id, plus its stats."""

    def __init__(self, name: str, frame: pd.DataFrame):
        self.name = name
        self.as_of = int(frame["as_of"].iloc[0])
        self.values: Dict[int, int] = dict(
            zip(frame["entity_id"].astype(int), frame["value"].astype(int))
        )
        self.last_event: Dict[int, int] = dict(
            zip(frame["entity_id"].astype(int), frame["last_event_ts"].astype(int))
        )
        self.stats = {
            "entities": len(self.values),
            "nonzero": int((frame["value"] > 0).sum()),
            "mean": round(float(frame["value"].mean()), 3),
            "median": float(frame["value"].median()),
            "max": int(frame["value"].max()),
            "median_staleness_seconds": int((self.as_of - frame["last_event_ts"]).median()),
        }

    def lookup(self, entity_id: int) -> Dict[str, Any] | None:
        if entity_id not in self.values:
            return None
        last = self.last_event[entity_id]
        return {
            "feature": self.name,
            "entity": FEATURE_DEFINITIONS[self.name]["entity"],
            "entity_id": entity_id,
            "value": self.values[entity_id],
            "as_of": self.as_of,
            # Measured, not declared.
            "staleness_seconds": self.as_of - last,
            "last_event_ts": last,
        }


TABLES: Dict[str, FeatureTable] = {}


def load_feature_store() -> None:
    """Called from the FastAPI lifespan handler."""
    logger.info("Loading feature store from %s", STORE_DIR)
    if not STORE_DIR.is_dir():
        logger.warning("No feature store at %s -- /features will serve the registry only", STORE_DIR)
        return

    for path in sorted(STORE_DIR.glob("*.parquet")):
        name = path.stem
        if name not in FEATURE_DEFINITIONS:
            logger.warning("Skipping %s: no definition registered", path.name)
            continue
        try:
            table = FeatureTable(name, pd.read_parquet(path))
        except Exception as exc:
            logger.error("Could not load %s: %s", path.name, exc)
            continue

        TABLES[name] = table
        logger.info(
            "Loaded feature '%s': %s entities, %s nonzero",
            name,
            f"{table.stats['entities']:,}",
            f"{table.stats['nonzero']:,}",
        )


# ============================================================
# Routes
# ============================================================
@router.get("")
@router.get("/")
async def list_features():
    """Registry: every defined feature, with materialisation status and real stats."""
    out = []
    for name, definition in FEATURE_DEFINITIONS.items():
        table = TABLES.get(name)
        out.append(
            {
                **definition,
                "materialized": table is not None,
                "as_of": table.as_of if table else None,
                "stats": table.stats if table else None,
            }
        )
    return {"features": out}


@router.get("/{feature_name}/entity/{entity_id}")
async def get_feature_value(feature_name: str, entity_id: int):
    """Single feature lookup by entity key -- the online serving path."""
    start = time.perf_counter()

    table = TABLES.get(feature_name)
    if table is None:
        raise HTTPException(
            404, f"Feature '{feature_name}' not materialised. Available: {sorted(TABLES)}"
        )

    result = table.lookup(entity_id)
    if result is None:
        raise HTTPException(
            404,
            f"No value for {FEATURE_DEFINITIONS[feature_name]['entity']} {entity_id}. "
            f"Cold start: this entity has no events in the source log.",
        )

    result["lookup_ms"] = round((time.perf_counter() - start) * 1000, 4)
    return result


@router.post("/batch")
async def get_feature_batch(
    entity_ids: List[int],
    feature_names: List[str] = Query(default=None),
):
    """Multi-entity lookup -- the shape a training-set builder or a ranker uses."""
    start = time.perf_counter()
    names = feature_names or sorted(TABLES)

    missing = [n for n in names if n not in TABLES]
    if missing:
        raise HTTPException(404, f"Not materialised: {missing}. Available: {sorted(TABLES)}")

    rows = []
    for entity_id in entity_ids:
        row: Dict[str, Any] = {"entity_id": entity_id}
        for name in names:
            hit = TABLES[name].lookup(entity_id)
            row[name] = hit["value"] if hit else None
        rows.append(row)

    return {
        "features": names,
        "count": len(rows),
        "rows": rows,
        "lookup_ms": round((time.perf_counter() - start) * 1000, 3),
    }