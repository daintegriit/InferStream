# backend/state/prediction_store.py

from datetime import datetime
from typing import Dict, List, Any

# In-memory prediction log (Phase 2)
PREDICTION_STORE: List[Dict[str, Any]] = []

def log_prediction(
    model: str,
    features: Dict[str, Any],
    prediction: int
) -> None:
    """
    Store a prediction event for drift analysis.
    """
    PREDICTION_STORE.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "model": model,
        "gender": features.get("gender"),
        "demographic": features.get("demographic", "unknown"),
        "prediction": prediction,
    })

def get_predictions() -> List[Dict[str, Any]]:
    return PREDICTION_STORE