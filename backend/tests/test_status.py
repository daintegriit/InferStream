import pytest

@pytest.mark.asyncio
async def test_status_endpoint(async_test_client):
    response = await async_test_client.get("/status/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"].lower() in ["ok", "healthy", "running"]
