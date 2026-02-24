from fastapi import APIRouter, Body, Depends, Header, HTTPException, status
from services.validation import validate_input
from typing import Dict, Any, List
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Optional API key check (reuses same logic as main.py if desired)
API_KEY = os.getenv("API_KEY", "changeme")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")


@router.post("/", summary="Validate input payload for PII, missing/nulls", tags=["Validation"])
async def validate_payload(
    payload: Dict[str, Any] = Body(..., example={"name": "John Doe", "email": "john@example.com"}),
    required_fields: List[str] = Body(default=[]),
    _: None = Depends(verify_api_key)  # 🔐 Optional: remove if not using API keys
):
    is_valid, errors = validate_input(payload, required_fields)
    
    if is_valid:
        logger.info("[Validation] Payload passed validation ✅")
        return {"valid": True, "errors": []}
    else:
        logger.warning(f"[Validation] Payload failed: {errors}")
        return {"valid": False, "errors": errors}
