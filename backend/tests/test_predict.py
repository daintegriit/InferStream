# backend/tests/test_predict.py

import pytest

@pytest.mark.asyncio
async def test_predict_valid_payload(async_test_client):
    payload = {
        "features": {
            "feature1": 0.5,
            "feature2": 1.2,
            "feature3": 0.3
        },
        "model": "xgboost"
    }

    response = await async_test_client.post("/predict/", json=payload)
    assert response.status_code == 200
    json_data = response.json()

    assert "prediction" in json_data
    assert "model" in json_data
    assert "shap_values" in json_data
    assert isinstance(json_data["shap_values"], list)

@pytest.mark.asyncio
async def test_predict_invalid_payload(async_test_client):
    payload = {
        "features": None,
        "model": "sklearn"
    }

    response = await async_test_client.post("/predict/", json=payload)
    assert response.status_code == 422 or response.status_code == 400
