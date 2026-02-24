from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
import logging
import uvicorn
import os
import platform
from datetime import datetime

# ============================================================
# Router Imports
# ============================================================
from routers.predict import router as predict_router
from routers.drift import router as drift_router
from routers.features import router as features_router
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
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ============================================================
# App Initialization
# ============================================================
app = FastAPI(
    title="InferStream ML API",
    description=(
        "InferStream is a real-time ML inference, fairness, drift, "
        "feature registry, and observability platform."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ============================================================
# CORS Configuration
# ============================================================
origins = [
    "http://localhost:3007",  # React frontend
    "http://localhost:5177",  # Vite dev
    "http://localhost:3000",
    "*",  # tighten in prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Global Exception Handler
# ============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ============================================================
# Optional API Key Guard (future)
# ============================================================
API_KEY = os.getenv("API_KEY")

def verify_api_key(x_api_key: str = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

# ============================================================
# Health Check
# ============================================================
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "inferstream"}

# ============================================================
# Build / Runtime Metadata
# ============================================================
@app.get("/status/meta", tags=["Status"])
def build_info():
    return {
        "build_id": os.getenv("BUILD_ID", "dev"),
        "git_sha": os.getenv("GIT_SHA", "local"),
        "environment": os.getenv("DEPLOY_ENV", "local"),
        "host": platform.node(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

# ============================================================
# Router Registration
# ============================================================
app.include_router(
    predict_router,
    prefix="/predict",
    tags=["Inference"],
)

app.include_router(
    drift_router,
    prefix="/drift",
    tags=["Drift"],
)

app.include_router(
    features_router,
    prefix="/features",
    tags=["Features"],
)

app.include_router(
    embeddings_router,
    prefix="/embeddings",
    tags=["Embeddings"],
)

app.include_router(
    labels_router,
    prefix="/labels",
    tags=["Labels"],
)

app.include_router(
    metrics_router,
    prefix="/metrics",
    tags=["Metrics"],
)

app.include_router(
    status_router,
    prefix="/status",
    tags=["Status"],
)

app.include_router(
    logs_router,
    prefix="/logs",
    tags=["Logs"],
)

app.include_router(
    validation_router,
    prefix="/validate",
    tags=["Validation"],
)

app.include_router(
    compare_router,
    prefix="/compare",
    tags=["Comparison"],
)

# ============================================================
# Entrypoint
# ============================================================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8007,
        reload=True,
    )