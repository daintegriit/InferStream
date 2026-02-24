import pytest
import uuid

@pytest.mark.asyncio
async def test_feature_ingestion_and_retrieval(async_test_client):
    feature_id = str(uuid.uuid4())
    payload = {
        "id": feature_id,
        "features": {
            "feature1": 1.0,
            "feature2": 2.5,
            "feature3": "value"
        },
        "metadata": {
            "source": "unit-test",
            "timestamp": "2025-07-13T12:00:00Z"
        }
    }

    # POST features
    post_response = await async_test_client.post("/features/", json=payload)
    assert post_response.status_code in [200, 201]
    post_data = post_response.json()
    assert post_data["id"] == feature_id

    # GET features
    get_response = await async_test_client.get(f"/features/{feature_id}")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["features"] == payload["features"]
    assert get_data["metadata"]["source"] == "unit-test"


@pytest.mark.asyncio
async def test_feature_ingestion_invalid_payload(async_test_client):
    bad_payload = {
        "id": 12345,  # Should be string (UUID)
        "features": "not-a-dict",
        "metadata": None
    }

    response = await async_test_client.post("/features/", json=bad_payload)
    assert response.status_code in [400, 422]
