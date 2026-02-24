# backend/routers/logs.py

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# -------- Log Schema -------- #
class InferenceLog(BaseModel):
    model: str
    input: dict
    prediction: str
    timestamp: str

# -------- In-Memory Log Store (can swap with DB/Redis) -------- #
inference_logs: List[InferenceLog] = []

# -------- Utility to Add a New Log -------- #
def save_log(model: str, input_data: dict, prediction: str):
    log_entry = InferenceLog(
        model=model,
        input=input_data,
        prediction=prediction,
        timestamp=datetime.utcnow().isoformat()
    )
    inference_logs.append(log_entry)
    logger.info(f"[Logs] Recorded: {log_entry.model} | {log_entry.prediction}")

# -------- GET /logs/latest -------- #
@router.get("/latest", response_model=InferenceLog)
def get_latest_log():
    if not inference_logs:
        return InferenceLog(
            model="unknown",
            input={},
            prediction="N/A",
            timestamp=datetime.utcnow().isoformat()
        )
    return inference_logs[-1]

# -------- GET /logs/recent -------- #
@router.get("/recent", response_model=List[InferenceLog])
def get_recent_logs(
    limit: int = Query(10, ge=1, le=100),
    model: Optional[str] = None
):
    logs = inference_logs[::-1]
    if model:
        logs = [log for log in logs if log.model == model]
    return logs[:limit]
