"""
backend/routers/predict.py

The feature contract is read off the fitted pipeline at load time. Nothing
about features is hardcoded here: add a column in the notebook, retrain,
drop in the pkl, and the API contract, the validation rules and the
dashboard form all follow automatically.

Only self-contained sklearn Pipelines are accepted. A bare estimator plus
loose scaler/encoder files is the arrangement that let training and serving
drift apart, so it is rejected at startup.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.pipeline import Pipeline

from state.prediction_store import log_prediction

logger = logging.getLogger(__name__)
router = APIRouter()

# Anchored to this file, not the working directory: uvicorn runs from backend/,
# python main.py may not, and Docker does something else again.
_BACKEND = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", _BACKEND / "models" / "netflix"))

MODEL_FILES = {
    "xgboost": "xgb_pipeline.pkl",
    "sklearn": "sklearn_pipeline.pkl",
}


class InferenceRequest(BaseModel):
    model: str
    features: Dict[str, Any]


def _introspect(pipeline: Pipeline) -> Tuple[List[str], List[str], Dict[str, List[str]]]:
    """Read numeric columns, categorical columns and vocabularies off the fitted
    ColumnTransformer."""
    numeric: List[str] = []
    categorical: List[str] = []
    vocabularies: Dict[str, List[str]] = {}

    steps = getattr(pipeline, "named_steps", {})
    pre = steps.get("preprocessor") or steps.get("pre")
    if pre is None or not hasattr(pre, "transformers_"):
        return numeric, categorical, vocabularies

    for _name, transformer, columns in pre.transformers_:
        if isinstance(transformer, str):  # "drop" / "passthrough"
            continue
        cats = getattr(transformer, "categories_", None)
        if cats is not None:
            for col, values in zip(columns, cats):
                categorical.append(col)
                vocabularies[col] = [str(v) for v in values]
        else:
            numeric.extend(columns)

    return numeric, categorical, vocabularies


class Predictor:
    def __init__(self, name: str, pipeline: Any):
        if not isinstance(pipeline, Pipeline):
            raise ValueError(
                f"'{name}' is a bare {type(pipeline).__name__}, not a Pipeline. "
                f"Re-export it with the ColumnTransformer included so preprocessing "
                f"travels with the model."
            )

        self.name = name
        self.pipeline = pipeline

        # Exact column set AND order the pipeline was fitted on.
        self.input_features: List[str] = list(getattr(pipeline, "feature_names_in_", []))
        if not self.input_features:
            raise ValueError(
                f"'{name}' has no feature_names_in_. Fit it on a DataFrame so the "
                f"column contract travels with the artifact."
            )

        self.numeric, self.categorical, self.vocabularies = _introspect(pipeline)

    # ---------- validation ----------

    def validate(self, raw: Dict[str, Any]) -> None:
        missing = [f for f in self.input_features if f not in raw]
        if missing:
            raise HTTPException(400, f"Missing required features: {missing}")

        extra = [k for k in raw if k not in self.input_features]
        if extra:
            logger.info("[%s] ignoring features not in contract: %s", self.name, extra)

        for col, allowed in self.vocabularies.items():
            value = str(raw.get(col))
            if value not in allowed:
                # The encoder uses handle_unknown='ignore', which would zero the
                # whole column and predict on a silently degraded vector. Reject.
                raise HTTPException(
                    400, f"Unknown value for '{col}': {value!r}. Expected one of {allowed}"
                )

        for col in self.numeric:
            try:
                float(raw[col])
            except (TypeError, ValueError):
                raise HTTPException(400, f"Feature '{col}' must be numeric, got {raw[col]!r}")

    # ---------- inference ----------

    def _frame(self, raw: Dict[str, Any]) -> pd.DataFrame:
        # Coerce to the types the pipeline was fitted on. A JSON body sending
        # "51" for age would otherwise hand StandardScaler an object column.
        row = {
            col: (float(raw[col]) if col in self.numeric else str(raw[col]))
            for col in self.input_features  # order from the artifact
        }
        return pd.DataFrame([row])

    def probability(self, raw: Dict[str, Any]) -> float:
        frame = self._frame(raw)
        if hasattr(self.pipeline, "predict_proba"):
            return float(self.pipeline.predict_proba(frame)[0][1])
        return float(self.pipeline.predict(frame)[0])

    def schema(self) -> Dict[str, Any]:
        return {
            "model": self.name,
            "features": [
                {
                    "name": col,
                    "type": "categorical" if col in self.vocabularies else "numeric",
                    "allowed_values": self.vocabularies.get(col),
                }
                for col in self.input_features
            ],
        }


LOADED: Dict[str, Predictor] = {}


def load_models() -> None:
    """Called from the FastAPI lifespan handler, never at import time."""
    logger.info("Loading models from %s", MODEL_DIR)

    for name, filename in MODEL_FILES.items():
        path = MODEL_DIR / filename
        if not path.is_file():
            logger.error("Missing model file: %s", path)
            continue
        try:
            predictor = Predictor(name, joblib.load(path))
        except Exception as exc:
            logger.error("Could not load '%s' from %s: %s", name, filename, exc)
            continue

        LOADED[name] = predictor
        logger.info(
            "Loaded '%s': %d features (%d numeric, %d categorical)",
            name,
            len(predictor.input_features),
            len(predictor.numeric),
            len(predictor.categorical),
        )

    if not LOADED:
        raise RuntimeError(f"No models loaded from {MODEL_DIR}. Refusing to start.")


def _get(name: str) -> Predictor:
    if name not in LOADED:
        raise HTTPException(404, f"Model '{name}' not available. Loaded: {sorted(LOADED)}")
    return LOADED[name]


# ============================================================
# Routes
# ============================================================
@router.get("/schema")
async def list_schemas():
    """Lets the dashboard render its form from the artifact instead of hardcoding fields."""
    return {"models": [p.schema() for p in LOADED.values()]}


@router.post("")
@router.post("/")
async def predict(req: InferenceRequest):
    predictor = _get(req.model)
    raw = dict(req.features)
    predictor.validate(raw)

    probability = predictor.probability(raw)
    label = int(probability >= 0.5)

    log_prediction(model=req.model, features=raw, prediction=label)

    return {"model": req.model, "prediction": label, "probability": round(probability, 6)}


@router.post("/fairness")
async def predict_fairness(req: InferenceRequest, attribute: str = "gender"):
    """Counterfactual sweep: hold everything fixed, vary one categorical attribute."""
    predictor = _get(req.model)
    raw = dict(req.features)
    predictor.validate(raw)

    if attribute not in predictor.vocabularies:
        raise HTTPException(
            400, f"'{attribute}' is not categorical. Options: {sorted(predictor.vocabularies)}"
        )

    results = {
        value: round(predictor.probability({**raw, attribute: value}), 6)
        for value in predictor.vocabularies[attribute]
    }

    return {
        "model": req.model,
        "fairness_check": {
            "attribute": attribute,
            "observed_value": str(raw[attribute]),
            "probabilities": results,
            "max_spread": round(max(results.values()) - min(results.values()), 6),
        },
    }