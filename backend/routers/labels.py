# backend/routers/labels.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

# -------- Label Schema -------- #
class LabelDefinition(BaseModel):
    label: str
    task_type: str  # e.g., binary, multiclass, regression
    example: float
    description: str

# -------- Static Label List (Placeholder for DB/Future logic) -------- #
LABEL_CATALOG = [
    LabelDefinition(
        label="churned",
        task_type="binary",
        example=1.0,
        description="Whether the user stopped using the service in the last 30 days"
    ),
    LabelDefinition(
        label="liked_content",
        task_type="binary",
        example=0.0,
        description="Whether the user gave positive feedback or thumbs up"
    ),
    LabelDefinition(
        label="clicked_promo",
        task_type="binary",
        example=1.0,
        description="User clicked on a promotional banner"
    ),
    LabelDefinition(
        label="engagement_score",
        task_type="regression",
        example=7.4,
        description="Numerical score representing content engagement (0–10)"
    )
]

# -------- API Endpoint -------- #
@router.get("/", response_model=List[LabelDefinition])
def get_labels():
    return LABEL_CATALOG
