# backend/routers/embeddings.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import logging

# Optional: sentence-transformers (pip install sentence-transformers)
from sentence_transformers import SentenceTransformer

router = APIRouter()
logger = logging.getLogger(__name__)

# -------- Load Embedding Model -------- #
try:
    embedder = SentenceTransformer("all-MiniLM-L6-v2")  # Lightweight + fast
    logger.info("[Embeddings] SentenceTransformer loaded")
except Exception as e:
    logger.warning(f"[Embeddings] Failed to load model: {e}")
    embedder = None

# -------- Request Schema -------- #
class EmbeddingRequest(BaseModel):
    texts: List[str]
    normalize: Optional[bool] = True

# -------- Response Schema -------- #
class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]

# -------- API Endpoint -------- #
@router.post("/", response_model=EmbeddingResponse)
def generate_embeddings(req: EmbeddingRequest):
    if not embedder:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    try:
        raw_vectors = embedder.encode(req.texts, normalize_embeddings=req.normalize)
        return EmbeddingResponse(embeddings=raw_vectors.tolist())

    except Exception as e:
        logger.error(f"[Embeddings] Error generating vectors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# -------- Example Static GET (Demo) -------- #
@router.get("/demo")
def get_demo_embeddings():
    return [
        {"id": "user_001", "vector": [0.12, 0.98, 0.34]},
        {"id": "user_002", "vector": [0.44, 0.11, 0.89]}
    ]
