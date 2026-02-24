from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import joblib
import os
import traceback
import pandas as pd

from state.prediction_store import log_prediction

router = APIRouter()

# ============================================================
# Request Schema
# ============================================================
class InferenceRequest(BaseModel):
    model: str
    features: Dict[str, Any]

# ============================================================
# Model Paths
# ============================================================
MODEL_DIR = "models/netflix"

MODEL_FILES = {
    "xgboost": "xgb_pipeline.pkl",
    "sklearn": "sklearn_model.pkl",
}

LOADED_MODELS: Dict[str, Any] = {}

# ============================================================
# REQUIRED RAW FEATURES (frontend contract)
# ============================================================
REQUIRED_FEATURES = {
    "age",
    "watch_hours",
    "last_login_days",
    "monthly_fee",
    "number_of_profiles",
    "avg_watch_time_per_day",
    "gender",
    "subscription_type",
    "region",
    "device",
}

# ============================================================
# CANONICAL ENCODED FEATURE NAMES (FROM TRAINING)
# ============================================================
FEATURE_NAMES = [
    "num__age",
    "num__watch_hours",
    "num__last_login_days",
    "num__monthly_fee",
    "num__number_of_profiles",
    "num__avg_watch_time_per_day",

    "cat__gender_Female",
    "cat__gender_Male",
    "cat__gender_Other",

    "cat__subscription_type_Basic",
    "cat__subscription_type_Premium",
    "cat__subscription_type_Standard",

    "cat__region_Africa",
    "cat__region_Asia",
    "cat__region_Europe",
    "cat__region_North America",
    "cat__region_Oceania",
    "cat__region_South America",

    "cat__device_Desktop",
    "cat__device_Laptop",
    "cat__device_Mobile",
    "cat__device_TV",
    "cat__device_Tablet",
]

# ============================================================
# Startup: Load Models
# ============================================================
def load_models():
    for name, filename in MODEL_FILES.items():
        path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(path):
            print(f"❌ Missing model file: {path}")
            continue
        try:
            LOADED_MODELS[name] = joblib.load(path)
            print(f"✅ Loaded {name} from {filename}")
        except Exception as e:
            print(f"❌ Failed loading {name}: {e}")

load_models()

# ============================================================
# Helpers
# ============================================================
def _validate_required_features(features: Dict[str, Any]) -> None:
    missing = REQUIRED_FEATURES - set(features.keys())
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required features: {sorted(missing)}"
        )

def _normalize_gender(val: Any) -> str:
    if val is None:
        return "Other"
    s = str(val).strip().lower()
    if s in ("male", "m"):
        return "Male"
    if s in ("female", "f"):
        return "Female"
    return "Other"

def _encode_features(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Encode raw features into EXACT training schema
    """
    encoded = {f: 0 for f in FEATURE_NAMES}

    # numeric
    encoded["num__age"] = raw["age"]
    encoded["num__watch_hours"] = raw["watch_hours"]
    encoded["num__last_login_days"] = raw["last_login_days"]
    encoded["num__monthly_fee"] = raw["monthly_fee"]
    encoded["num__number_of_profiles"] = raw["number_of_profiles"]
    encoded["num__avg_watch_time_per_day"] = raw["avg_watch_time_per_day"]

    # categorical
    encoded[f"cat__gender_{raw['gender']}"] = 1
    encoded[f"cat__subscription_type_{raw['subscription_type']}"] = 1
    encoded[f"cat__region_{raw['region']}"] = 1
    encoded[f"cat__device_{raw['device']}"] = 1

    return encoded

def _predict(model_obj, encoded_features: Dict[str, Any]) -> int:
    df = pd.DataFrame([encoded_features])
    pred = model_obj.predict(df)[0]
    return int(pred)

# ============================================================
# Prediction Endpoint
# ============================================================
@router.post("")
@router.post("/")
async def predict(req: InferenceRequest):
    if req.model not in LOADED_MODELS:
        raise HTTPException(404, f"Model '{req.model}' not available")

    _validate_required_features(req.features)

    try:
        model_obj = LOADED_MODELS[req.model]

        raw = dict(req.features)
        raw["gender"] = _normalize_gender(raw["gender"])

        encoded = _encode_features(raw)
        prediction = _predict(model_obj, encoded)

        log_prediction(
            model=req.model,
            features=raw,
            prediction=prediction
        )

        return {
            "model": req.model,
            "prediction": prediction
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {e}"
        )

# ============================================================
# Fairness Endpoint (Gender Flip)
# ============================================================
@router.post("/fairness")
async def predict_fairness(req: InferenceRequest):
    if req.model not in LOADED_MODELS:
        raise HTTPException(404, f"Model '{req.model}' not available")

    _validate_required_features(req.features)

    try:
        model_obj = LOADED_MODELS[req.model]

        raw = dict(req.features)
        base_gender = _normalize_gender(raw["gender"])
        raw["gender"] = base_gender

        encoded_base = _encode_features(raw)

        # flip gender
        encoded_alt = encoded_base.copy()
        encoded_alt["cat__gender_Male"], encoded_alt["cat__gender_Female"] = (
            encoded_base["cat__gender_Female"],
            encoded_base["cat__gender_Male"],
        )

        pred_base = _predict(model_obj, encoded_base)
        pred_alt = _predict(model_obj, encoded_alt)

        return {
            "model": req.model,
            "fairness_check": {
                "attribute": "gender",
                "base_gender": base_gender,
                "alt_gender": "Female" if base_gender == "Male" else "Male",
                "base_prediction": pred_base,
                "alt_prediction": pred_alt,
                "is_fair": pred_base == pred_alt,
                "delta": pred_alt - pred_base
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Fairness check failed: {e}"
        )