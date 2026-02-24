# tests/test_labels.py

import pytest

@pytest.mark.asyncio
async def test_label_generation(async_test_client):
    payload = {
        "input_data": {
            "feature1": 0.9,
            "feature2": 0.1
        },
        "label_strategy": "threshold"
    }

    response = await async_test_client.post("/labels/", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "label" in result
    assert result["strategy"] == "threshold"


@pytest.mark.asyncio
async def test_label_generation_missing_fields(async_test_client):
    payload = {
        "label_strategy": "threshold"
    }
    response = await async_test_client.post("/labels/", json=payload)
    assert response.status_code in [400, 422]
