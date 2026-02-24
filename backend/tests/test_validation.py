# backend/tests/test_validation.py

import pytest
from services.validation import validate_input, remove_null_fields, strip_pii_features


def test_validate_input_all_good():
    features = {
        "name": "Alice",
        "age": 30,
        "email": "not-an-email"  # Invalid pattern, but we won't detect unless it's valid
    }
    required_fields = ["name", "age"]
    is_valid, errors = validate_input(features, required_fields)
    assert is_valid is True
    assert errors == []


def test_validate_input_missing_field():
    features = {
        "name": "Alice"
    }
    required_fields = ["name", "age"]
    is_valid, errors = validate_input(features, required_fields)
    assert is_valid is False
    assert any("Missing required field" in e for e in errors)


def test_validate_input_null_field():
    features = {
        "name": None,
        "age": 25
    }
    required_fields = ["name", "age"]
    is_valid, errors = validate_input(features, required_fields)
    assert is_valid is False
    assert any("is null" in e for e in errors)


def test_validate_input_detect_pii():
    features = {
        "email": "user@example.com",
        "ssn": "123-45-6789",
        "phone": "555-123-4567"
    }
    is_valid, errors = validate_input(features)
    assert is_valid is False
    assert any("Potential PII detected" in e for e in errors)


def test_remove_null_fields():
    features = {
        "name": "Bob",
        "email": None,
        "phone": "1234567890"
    }
    cleaned = remove_null_fields(features)
    assert "email" not in cleaned
    assert "name" in cleaned
    assert cleaned["phone"] == "1234567890"


def test_strip_pii_fields():
    features = {
        "email": "bob@example.com",
        "phone": "555-123-4567",
        "name": "Bob"
    }
    cleaned = strip_pii_features(features)
    assert cleaned["email"] == "[REDACTED]"
    assert cleaned["phone"] == "[REDACTED]"
    assert cleaned["name"] == "Bob"
