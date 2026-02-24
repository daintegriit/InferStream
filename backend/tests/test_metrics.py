import pytest
import uuid

@pytest.mark.asyncio
async def test_metrics_ingestion(async_test_client):
    metric_id = str(uuid.uuid4())
    payload = {
        "id": metric_id,
        "model": "xgboost",
        "metrics": {
            "accuracy": 0.94,
            "f1": 0.92,
            "precision": 0.91,
            "recall": 0.93
        },
        "meta": {
            "run_id": "test-run-001",
            "timestamp": "2025-07-13T12:00:00Z"
        }
    }

    response = await async_test_client.post("/metrics/", json=payload)
    assert response.status_code in [200, 201]
    assert response.json()["id"] == metric_id


@pytest.mark.asyncio
async def test_metrics_ingestion_invalid_payload(async_test_client):
    response = await async_test_client.post("/metrics/", json={
        "id": None,
        "metrics": "not-a-dict",
        "meta": 1234
    })
    assert response.status_code in [400, 422]
