# backend/services/validation.py

from typing import Dict, Any, List, Tuple
import logging
import re

logger = logging.getLogger(__name__)

# -------- Define Optional PII Patterns -------- #
PII_PATTERNS = {
    "email": r"[^@]+@[^@]+\.[^@]+",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "phone": r"\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b"
}

# -------- Validate Input Schema -------- #
def validate_input(features: Dict[str, Any], required_fields: List[str] = []) -> Tuple[bool, List[str]]:
    errors = []

    for field in required_fields:
        if field not in features:
            errors.append(f"Missing required field: {field}")
        elif features[field] is None:
            errors.append(f"Field '{field}' is null")

    for key, value in features.items():
        if isinstance(value, str):
            for pii_name, pattern in PII_PATTERNS.items():
                if re.search(pattern, value):
                    errors.append(f"Potential PII detected in '{key}': pattern {pii_name}")

    if errors:
        logger.warning(f"[Validation] Failed validation: {errors}")
    return (len(errors) == 0, errors)

# -------- Utility: Clean Nulls -------- #
def remove_null_fields(features: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = {k: v for k, v in features.items() if v is not None}
    removed = [k for k in features if features[k] is None]
    if removed:
        logger.info(f"[Validation] Removed null fields: {removed}")
    return cleaned

# -------- Optional: Strip PII Fields -------- #
def strip_pii_features(features: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = features.copy()
    for key, value in features.items():
        if isinstance(value, str):
            for pattern in PII_PATTERNS.values():
                if re.search(pattern, value):
                    cleaned[key] = "[REDACTED]"
                    logger.info(f"[Validation] Redacted PII from '{key}'")
    return cleaned
