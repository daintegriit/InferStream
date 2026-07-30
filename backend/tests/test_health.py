# backend/tests/test_health.py

"""The previous version of this file called GET /status/, not /health, and
asserted a `status` key that /status/ does not return. It was testing the
wrong endpoint."""


async def test_health_reports_shape(async_test_client):
    """Without the lifespan, nothing is loaded -- /health must say so rather
    than reporting ok."""
    response = await async_test_client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "inferstream"
    assert isinstance(data["status"], str)
    assert isinstance(data["models_loaded"], list)
    assert isinstance(data["features_materialized"], list)

    # Empty registries must not report healthy: that is the whole point of
    # putting the lists in the response.
    if not data["models_loaded"]:
        assert data["status"] == "degraded"


async def test_health_ok_when_loaded(live_client):
    """With the lifespan run, models are loaded and status is ok."""
    response = await live_client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["models_loaded"], "lifespan ran but no models loaded"