from fastapi import APIRouter
from models.feature_store import FEATURE_STORE
from services.model_loader import load_model
import datetime
import platform
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Startup timestamp
START_TIME = time.time()

# -------- Root Status Endpoint -------- #
@router.get("/")
def get_status_root():
    return {
        "message": "📡 InferStream Status OK",
        "server": platform.node(),
        "uptime_seconds": int(time.time() - START_TIME),
        "env": "local",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

# -------- Feature Status Summary -------- #
@router.get("/features")
def get_feature_status():
    return [
        {
            "feature": f["name"],
            "last_updated": f["last_updated"],
            "source": f["source"]
        }
        for f in FEATURE_STORE.values()
    ]

# -------- API Health & Metadata -------- #
@router.get("/health")
def get_health_check():
    uptime_sec = int(time.time() - START_TIME)
    return {
        "status": "✅ API is alive",
        "uptime_seconds": uptime_sec,
        "server": platform.node(),
        "python_version": platform.python_version(),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

# -------- Model Registry Summary -------- #
@router.get("/models")
def get_model_versions():
    available_models = []
    for model_type in ["xgboost", "sklearn", "pytorch", "keras"]:
        for version in ["v1", "v2"]:
            model = load_model(model_type, version)
            available_models.append({
                "model": model_type,
                "version": version,
                "loaded": model is not None
            })
    return available_models

# -------- Changelog (UI Compatibility) -------- #
@router.get("/changelog")
def get_changelog():
    """
    Lightweight changelog endpoint to keep frontend + CI happy.
    Can be extended later to read from git tags, files, or DB.
    """
    return {
        "version": "v1.0.0",
        "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        "changes": [
            "Initial InferStream ML platform backend",
            "Prediction, fairness, SHAP explainability",
            "Feature store + status endpoints",
            "Docker-ready API"
        ]
    }