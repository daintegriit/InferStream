# tests/test_logs.py

import pytest
import uuid

@pytest.mark.asyncio
async def test_log_submission(async_test_client):
    log_id = str(uuid.uuid4())
    payload = {
        "id": log_id,
        "event": "inference_request",
        "details": {
            "model": "xgboost",
            "user_id": "test-user",
            "input": {"feature1": 1.2, "feature2": 3.4},
            "output": {"prediction": 1}
        },
        "timestamp": "2025-07-13T12:00:00Z"
    }

    response = await async_test_client.post("/logs/", json=payload)
    assert response.status_code in [200, 201]
    assert response.json()["id"] == log_id


@pytest.mark.asyncio
async def test_log_submission_missing_fields(async_test_client):
    payload = {
        "event": "inference_request",
        "details": None
    }
    response = await async_test_client.post("/logs/", json=payload)
    assert response.status_code in [400, 422]
