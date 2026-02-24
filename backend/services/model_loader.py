import os
import json
import joblib
import torch
import xgboost as xgb
import tensorflow as tf
import logging

from typing import Optional, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# ==== MODEL DIRECTORY ====
MODEL_DIR = os.getenv("MODEL_DIR", "models/netflix")

# ==== Supported Models & Files ====
SUPPORTED_MODELS = {
    "xgboost": "xgb_model.pkl",
    "ctr": "ctr_model_xgb.pkl",
    "engagement": "engagement_model_xgb.pkl",
    "sklearn": "sklearn_model.pkl",
    "keras": "keras_model.h5",
    "tfrs": "tfrs_model.keras",
    "tfrs_weights": "tfrs_model.weights.h5",
    "pytorch": "pytorch_model.pt",
    "svd": "svd_model.pkl"
}

FEATURE_FILES = {
    "pytorch": "feature_names_pytorch.json"
}

# ==== Safe Loader ====
def safe_load(path: str, model_type: str) -> Optional[Any]:
    try:
        # ---- XGBoost / CTR / Engagement ----
        if model_type in ["xgboost", "ctr", "engagement", "sklearn", "svd"]:
            return joblib.load(path)

        # ---- Keras ----
        elif model_type == "keras":
            return tf.keras.models.load_model(path)

        # ---- TFRS ----
        elif model_type == "tfrs":
            return tf.keras.models.load_model(path)

        elif model_type == "tfrs_weights":
            base = path.replace(".weights.h5", ".keras")
            model = tf.keras.models.load_model(base)
            model.load_weights(path)
            return model

        # ---- PyTorch (CRITICAL FIX) ----
        elif model_type == "pytorch":
            import json

            # Get correct feature count
            feature_path = os.path.join(MODEL_DIR, "feature_names_pytorch.json")
            if not os.path.exists(feature_path):
                raise RuntimeError(f"Missing feature file: {feature_path}")

            with open(feature_path, "r") as f:
                n_features = len(json.load(f))

            # ✅ MUST match training architecture (plain nn.Sequential)
            model = torch.nn.Sequential(
                torch.nn.Linear(n_features, 32),
                torch.nn.ReLU(),
                torch.nn.Linear(32, 16),
                torch.nn.ReLU(),
                torch.nn.Linear(16, 1),
                torch.nn.Sigmoid(),
            )

            state_dict = torch.load(path, map_location=torch.device("cpu"))
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            return model

        else:
            raise ValueError(f"Unsupported model type: {model_type}")

    except Exception as e:
        logger.error(f"[ModelLoader] Failed loading {model_type}: {e}")
        return None

# ==== Resolve Path ====
def resolve_model_path(model_type: str) -> Optional[str]:
    filename = SUPPORTED_MODELS.get(model_type)
    if not filename:
        return None

    path = os.path.join(MODEL_DIR, filename)
    return path if os.path.isfile(path) else None

# ==== Cached Loader ====
@lru_cache(maxsize=16)
def load_model(model_type: str) -> Optional[Any]:
    path = resolve_model_path(model_type)
    if not path:
        logger.warning(f"[ModelLoader] Model not found: {model_type}")
        return None

    logger.info(f"[ModelLoader] Loading {model_type} from {path}")
    return safe_load(path, model_type)