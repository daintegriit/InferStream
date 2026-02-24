# backend/services/metrics_tracker.py

from typing import Dict, List, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Internal in-memory log (use a DB in production)
fairness_log: List[Dict] = []

# -------- Track Fairness Entry -------- #
def track_fairness(
    model: str,
    demographic: Optional[str],
    gender: Optional[str],
    features: Dict[str, float],
    prediction: float
):
    entry = {
        "model": model,
        "demographic": demographic or "unknown",
        "gender": gender or "unknown",
        "features": features,
        "prediction": prediction
    }
    fairness_log.append(entry)
    logger.info(f"[Fairness] Logged entry: {entry}")

# -------- Summarize Fairness Report -------- #
def summarize_fairness() -> List[Dict]:
    if not fairness_log:
        return []

    summary = defaultdict(lambda: defaultdict(list))

    for entry in fairness_log:
        key = (entry["demographic"], entry["gender"])
        summary[key]["predictions"].append(entry["prediction"])
        summary[key]["model"] = entry["model"]

    report = []
    for (demographic, gender), group in summary.items():
        preds = group["predictions"]
        avg_pred = round(sum(preds) / len(preds), 4) if preds else 0.0

        report.append({
            "model": group["model"],
            "demographic": demographic,
            "gender": gender,
            "count": len(preds),
            "avg_prediction": avg_pred
        })

    return report
