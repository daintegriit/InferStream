import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# -------- Global Transformers -------- #
scaler = StandardScaler()

# ✅ FIXED FOR sklearn >= 1.2
encoder = OneHotEncoder(
    sparse_output=False,
    handle_unknown="ignore"
)

# -------- Helper: Convert input dict to DataFrame -------- #
def prepare_input_dataframe(features: Dict[str, Any]) -> pd.DataFrame:
    try:
        df = pd.DataFrame([features])

        for col in df.columns:
            val = df[col].iloc[0]
            if isinstance(val, (int, float, np.number)):
                df[col] = pd.to_numeric(df[col], errors="coerce")
            else:
                df[col] = df[col].astype("category")

        return df
    except Exception as e:
        logger.error(f"[FeaturePipeline] Error preparing DataFrame: {e}")
        return pd.DataFrame()

# -------- Fit Transformers (TRAINING ONLY) -------- #
def fit_transformers(data: pd.DataFrame):
    num_cols = data.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = data.select_dtypes(include=["object", "category"]).columns.tolist()

    if num_cols:
        scaler.fit(data[num_cols])
        logger.info(f"[FeaturePipeline] Scaler fitted on: {num_cols}")

    if cat_cols:
        encoder.fit(data[cat_cols])
        logger.info(f"[FeaturePipeline] Encoder fitted on: {cat_cols}")

# -------- Transform Input Features (INFERENCE) -------- #
def transform_input(features: Dict[str, Any]) -> np.ndarray:
    try:
        features = features.copy()

        # ===============================
        # NORMALIZE SEMANTIC GENDER (CASE-SAFE)
        # ===============================
        if "gender" in features:
            raw = str(features["gender"]).strip().lower()

            if raw == "male":
                features["gender"] = "Male"
            elif raw == "female":
                features["gender"] = "Female"
            elif raw == "other":
                features["gender"] = "Other"
            else:
                logger.warning(
                    f"[FeaturePipeline] Unknown gender value '{features['gender']}', coercing to 'Other'"
                )
                features["gender"] = "Other"

        df = prepare_input_dataframe(features)

        if df.empty:
            logger.warning("[FeaturePipeline] Empty DataFrame.")
            return np.array([])

        # 🚨 HARD GUARD: encoder must be fitted
        if not hasattr(encoder, "categories_"):
            raise RuntimeError(
                "OneHotEncoder is not fitted. "
                "Did you call fit_transformers() during training or startup?"
            )

        num_cols = df.select_dtypes(include=["number"]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        num_array = scaler.transform(df[num_cols]) if num_cols else np.empty((1, 0))
        cat_array = encoder.transform(df[cat_cols]) if cat_cols else np.empty((1, 0))

        return np.concatenate([num_array, cat_array], axis=1)

    except Exception as e:
        logger.error(f"[FeaturePipeline] Transformation failed: {e}")
        return np.array([])

# -------- Metadata -------- #
def get_feature_metadata() -> Dict[str, Any]:
    return {
        "num_features": len(scaler.mean_) if hasattr(scaler, "mean_") else 0,
        "categories": [list(c) for c in encoder.categories_] if hasattr(encoder, "categories_") else [],
        "pipeline_ready": hasattr(scaler, "mean_") and hasattr(encoder, "categories_")
    }