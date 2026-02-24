from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import httpx

router = APIRouter()

MODELS = ["sklearn", "xgboost"]

class CompareRequest(BaseModel):
    features: Dict[str, Any]

@router.post("/")
async def compare_models(req: CompareRequest):
    results = {}

    async with httpx.AsyncClient() as client:
        for model in MODELS:
            try:
                resp = await client.post(
                    "http://localhost:8007/predict",
                    json={
                        "model": model,
                        "features": req.features
                    },
                    timeout=5
                )

                if resp.status_code != 200:
                    results[model] = {"error": resp.text}
                else:
                    results[model] = resp.json()["prediction"]

            except Exception as e:
                results[model] = {"error": str(e)}

    return {
        "results": results
    }