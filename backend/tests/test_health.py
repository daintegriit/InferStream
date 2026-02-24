import pytest

@pytest.mark.asyncio
async def test_health_ping(async_test_client):
    response = await async_test_client.get("/status/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data.get("status"), str)
