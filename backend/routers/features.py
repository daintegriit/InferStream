from fastapi import APIRouter
from datetime import datetime


router = APIRouter()  # ← no prefix here


FEATURES = [
    {
        "name": "user_age",
        "type": "numerical",
        "example": 29,
        "tags": ["user", "demographics"],
        "source": "user_profile_service",
        "last_updated": "2025-05-20T12:34:00Z",
        "freshness_seconds": 86400
    },
    {
        "name": "watch_time",
        "type": "numerical",
        "example": 132.5,
        "tags": ["engagement"],
        "source": "watch_tracking_service",
        "last_updated": "2025-05-20T12:35:00Z",
        "freshness_seconds": 3600
    },
    {
        "name": "genre_pref",
        "type": "categorical",
        "example": "sci-fi",
        "tags": ["preference"],
        "source": "content_preference_model",
        "last_updated": "2025-05-20T12:36:00Z",
        "freshness_seconds": 604800
    }
]

@router.get("/")
def list_available_features():
    return FEATURES