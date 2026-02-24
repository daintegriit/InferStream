import pytest
import uuid

@pytest.mark.asyncio
async def test_embedding_submission(async_test_client):
    embedding_id = str(uuid.uuid4())
    payload = {
        "id": embedding_id,
        "model": "sentence-transformer",
        "vector": [0.1, 0.2, 0.3, 0.4],
        "metadata": {
            "source": "unit-test",
            "text": "Example embedding"
        }
    }

    response = await async_test_client.post("/embeddings/", json=payload)
    assert response.status_code in [200, 201]
    assert response.json()["id"] == embedding_id


@pytest.mark.asyncio
async def test_embedding_submission_invalid_vector(async_test_client):
    payload = {
        "id": "invalid-id",
        "vector": "not-a-list",
        "metadata": {}
    }
    response = await async_test_client.post("/embeddings/", json=payload)
    assert response.status_code in [400, 422]
