"""
backend/main.py

InferStream API entrypoint.

Models and the feature store are loaded once in the lifespan handler. If no
model loads, startup fails loudly rather than serving an app that 404s every
inference request.
"""

from __future__ import annotations

import logging
import os
import platform
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

# ============================================================
# Routers
# ============================================================
from routers.predict import router as predict_router, load_models, LOADED
from routers.features import router as features_router, load_feature_store, TABLES
from routers.drift import router as drift_router
from routers.embeddings import router as embeddings_router
from routers.labels import router as labels_router
from routers.metrics import router as metrics_router
from routers.status import router as status_router
from routers.logs import router as logs_router
from routers.validation import router as validation_router
from routers.compare import router as compare_router

# ============================================================
# Logging
# ============================================================
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("inferstream")

# ============================================================
# Config (single source: .env)
# ============================================================
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8007"))
API_KEY = os.getenv("API_KEY")

# Explicit list only. Never combine "*" with allow_credentials=True -- Starlette
# will echo back any Origin, which lets any site make credentialed requests.
DEFAULT_ORIGINS = "http://localhost:5177,http://localhost:3007,http://localhost:3000"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]


# ============================================================
# Lifespan
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting InferStream API")
    load_models()          # raises RuntimeError if no model loads
    load_feature_store()   # warns and continues if nothing is materialised
    logger.info("Ready. Models: %s | Features: %s", sorted(LOADED), sorted(TABLES))
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="InferStream ML API",
    description=(
        "Real-time ML inference, fairness, drift, feature registry, "
        "and observability platform."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Error handling
# ============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # The traceback goes to the console; the client gets nothing useful.
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ============================================================
# Optional API key guard (wire into routers via Depends when needed)
# ============================================================
def verify_api_key(x_api_key: str = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")


# ============================================================
# Health / metadata
# ============================================================
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness plus what actually loaded -- empty lists are a red flag."""
    return {
        "status": "ok" if LOADED else "degraded",
        "service": "inferstream",
        "models_loaded": sorted(LOADED),
        "features_materialized": sorted(TABLES),
    }


@app.get("/status/meta", tags=["Status"])
def build_info():
    return {
        "build_id": os.getenv("BUILD_ID", "dev"),
        "git_sha": os.getenv("GIT_SHA", "local"),
        "environment": os.getenv("DEPLOY_ENV", "local"),
        "host": platform.node(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# Router registration
# ============================================================
app.include_router(predict_router, prefix="/predict", tags=["Inference"])
app.include_router(features_router, prefix="/features", tags=["Features"])
app.include_router(drift_router, prefix="/drift", tags=["Drift"])
app.include_router(embeddings_router, prefix="/embeddings", tags=["Embeddings"])
app.include_router(labels_router, prefix="/labels", tags=["Labels"])
app.include_router(metrics_router, prefix="/metrics", tags=["Metrics"])
app.include_router(status_router, prefix="/status", tags=["Status"])
app.include_router(logs_router, prefix="/logs", tags=["Logs"])
app.include_router(validation_router, prefix="/validate", tags=["Validation"])
app.include_router(compare_router, prefix="/compare", tags=["Comparison"])


# ============================================================
# Entrypoint
# ============================================================
if __name__ == "__main__":
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=True)