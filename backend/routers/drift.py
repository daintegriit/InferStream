# backend/routers/drift.py

from fastapi import APIRouter
from collections import defaultdict
from state.prediction_store import get_predictions

router = APIRouter()

@router.get("/")
def get_drift_summary():
    """
    Aggregate predictions by demographic + gender.
    Used by DriftChart.jsx
    """
    data = get_predictions()

    buckets = defaultdict(list)

    for row in data:
        key = (row["demographic"], row["gender"])
        buckets[key].append(row["prediction"])

    results = []
    for (demographic, gender), preds in buckets.items():
        avg_pred = sum(preds) / len(preds)
        results.append({
            "demographic": demographic,
            "gender": gender,
            "avg_prediction": round(avg_pred, 4),
            "count": len(preds),
        })

    return results