# backend/services/feature_pipeline.py
"""
Deterministic feature transform.

Column order and category vocabularies are frozen at fit time, persisted
alongside the model, and replayed at inference. Nothing is inferred from
the shape of an incoming request.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger(__name__)

ARTIFACT_VERSION = 1


class SkewError(RuntimeError):
    """Raised when inference input cannot be mapped onto the training contract."""


@dataclass(frozen=True)
class TransformSpec:
    """The exact contract the model was trained against."""

    numeric: List[str]                    # ordered
    categorical: List[str]                # ordered
    categories: Dict[str, List[str]]      # column -> ordered vocabulary
    version: int = ARTIFACT_VERSION

    @property
    def input_names(self) -> List[str]:
        return list(self.numeric) + list(self.categorical)

    @property
    def output_names(self) -> List[str]:
        """Names for each column of the transformed matrix. Feed these to SHAP."""
        names = list(self.numeric)
        for col in self.categorical:
            names.extend(f"{col}={v}" for v in self.categories[col])
        return names


class FeaturePipeline:
    def __init__(self, spec: TransformSpec, scaler: StandardScaler, encoder: OneHotEncoder):
        self.spec = spec
        self.scaler = scaler
        self.encoder = encoder

    # ---------- training ----------

    @classmethod
    def fit(cls, data: pd.DataFrame) -> "FeaturePipeline":
        numeric = sorted(data.select_dtypes(include=["number"]).columns)
        categorical = sorted(data.select_dtypes(include=["object", "category"]).columns)

        scaler = StandardScaler()
        encoder = OneHotEncoder(sparse_output=False, handle_unknown="error")

        if numeric:
            scaler.fit(data[numeric])
        if categorical:
            encoder.fit(data[categorical])

        categories = {
            col: [str(v) for v in cats]
            for col, cats in zip(categorical, getattr(encoder, "categories_", []))
        }

        spec = TransformSpec(numeric=numeric, categorical=categorical, categories=categories)
        logger.info("[FeaturePipeline] fitted on %d features", len(spec.input_names))
        return cls(spec, scaler, encoder)

    def save(self, model_dir: str | Path, name: str) -> None:
        d = Path(model_dir)
        d.mkdir(parents=True, exist_ok=True)
        joblib.dump({"scaler": self.scaler, "encoder": self.encoder}, d / f"{name}.transformers.pkl")
        (d / f"{name}.spec.json").write_text(json.dumps(asdict(self.spec), indent=2))

    # ---------- serving ----------

    @classmethod
    def load(cls, model_dir: str | Path, name: str) -> "FeaturePipeline":
        d = Path(model_dir)
        spec_path = d / f"{name}.spec.json"
        tf_path = d / f"{name}.transformers.pkl"
        if not spec_path.exists() or not tf_path.exists():
            raise SkewError(
                f"Missing transform artifacts for '{name}' in {d}. "
                f"Re-run training with FeaturePipeline.fit(...).save(...)."
            )

        raw = json.loads(spec_path.read_text())
        if raw.get("version") != ARTIFACT_VERSION:
            raise SkewError(
                f"Artifact version {raw.get('version')} != runtime {ARTIFACT_VERSION} for '{name}'."
            )

        spec = TransformSpec(**raw)
        bundle = joblib.load(tf_path)
        return cls(spec, bundle["scaler"], bundle["encoder"])

    def transform(self, features: Dict[str, Any]) -> np.ndarray:
        """Map a feature dict onto the frozen training layout. Fails loudly."""
        missing = [c for c in self.spec.input_names if c not in features]
        if missing:
            raise SkewError(f"Missing features required by the model: {missing}")

        extra = [k for k in features if k not in self.spec.input_names]
        if extra:
            logger.warning("[FeaturePipeline] ignoring features not in spec: %s", extra)

        for col in self.spec.categorical:
            value = str(features[col])
            if value not in self.spec.categories[col]:
                raise SkewError(
                    f"Unseen category for '{col}': {value!r}. "
                    f"Known: {self.spec.categories[col]}"
                )

        # Order comes from the spec, never from the request.
        parts = []
        if self.spec.numeric:
            row = pd.DataFrame([[features[c] for c in self.spec.numeric]], columns=self.spec.numeric)
            parts.append(self.scaler.transform(row))
        if self.spec.categorical:
            row = pd.DataFrame(
                [[str(features[c]) for c in self.spec.categorical]], columns=self.spec.categorical
            )
            parts.append(self.encoder.transform(row))

        return np.concatenate(parts, axis=1) if parts else np.empty((1, 0))

    def metadata(self) -> Dict[str, Any]:
        return {
            "version": self.spec.version,
            "n_input_features": len(self.spec.input_names),
            "n_output_columns": len(self.spec.output_names),
            "numeric": self.spec.numeric,
            "categorical": self.spec.categorical,
        }