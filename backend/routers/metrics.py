# backend/routers/metrics.py

from fastapi import APIRouter
from collections import defaultdict
import time
import logging
import platform

router = APIRouter()
logger = logging.getLogger(__name__)

# -------- Global State (in-memory) -------- #
START_TIME = time.time()
inference_counts = defaultdict(int)
latency_sums = defaultdict(float)
latency_counts = defaultdict(int)

# -------- Hook: Log Inference Stats -------- #
def record_inference(model_type: str, latency_ms: float):
    inference_counts[model_type] += 1
    latency_sums[model_type] += latency_ms
    latency_counts[model_type] += 1
    logger.debug(f"[Metrics] +1 for {model_type} | {latency_ms} ms")

# -------- Main Metrics Endpoint -------- #
@router.get("/")
def get_metrics():
    uptime = int(time.time() - START_TIME)
    metrics = {}

    for model in inference_counts:
        count = inference_counts[model]
        total_latency = latency_sums[model]
        avg_latency = round(total_latency / latency_counts[model], 2) if latency_counts[model] > 0 else 0.0

        metrics[model] = {
            "requests": count,
            "avg_latency_ms": avg_latency
        }

    return {
        "status": "✅ healthy",
        "uptime_seconds": uptime,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "server": platform.node(),
        "inference_metrics": metrics
    }
