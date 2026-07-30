# backend/tests/test_status.py


async def test_status_root(async_test_client):
    """GET /status/ returns a message, not a status field. The previous test
    asserted `status`, which this endpoint has never returned -- /health is
    the endpoint with that key."""
    response = await async_test_client.get("/status/")
    assert response.status_code == 200

    data = response.json()
    assert "message" in data
    assert "env" in data
    assert "timestamp" in data


async def test_status_meta(async_test_client):
    """Build metadata, including whether .env was actually read.

    dotenv_loaded is worth asserting: config silently falling back to code
    defaults cost several hours of debugging a CORS failure that looked like
    a server problem.
    """
    response = await async_test_client.get("/status/meta")
    assert response.status_code == 200

    data = response.json()
    assert "build_id" in data
    assert "git_sha" in data
    assert "environment" in data
    assert isinstance(data["cors_origins"], list)
    assert isinstance(data["dotenv_loaded"], bool)