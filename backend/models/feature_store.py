# backend/models/feature_store.py

FEATURE_STORE = {
    "user_age": {
        "name": "user_age",
        "type": "numerical",
        "example": 29,
        "tags": ["user", "demographics"],
        "last_updated": "2025-05-20T12:34:00Z",
        "source": "user_profile_service",
        "freshness_seconds": 86400,
        "description": "Age of the user in years"
    },
    "watch_time": {
        "name": "watch_time",
        "type": "numerical",
        "example": 132.5,
        "tags": ["engagement", "content"],
        "last_updated": "2025-05-20T12:35:00Z",
        "source": "watch_tracking_service",
        "freshness_seconds": 3600,
        "description": "Total minutes watched in the past 24 hours"
    },
    "genre_pref": {
        "name": "genre_pref",
        "type": "categorical",
        "example": "sci-fi",
        "tags": ["user", "preference"],
        "last_updated": "2025-05-20T12:36:00Z",
        "source": "content_preference_model",
        "freshness_seconds": 604800,
        "description": "Preferred genre predicted from viewing behavior"
    }
}
