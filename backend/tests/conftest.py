# backend/tests/conftest.py

import pytest
from httpx import ASGITransport, AsyncClient

from main import app

try:
    from asgi_lifespan import LifespanManager
except ImportError:  # pip install asgi-lifespan
    LifespanManager = None


@pytest.fixture
async def async_test_client():
    """Client bound to the app in-process, WITHOUT running the lifespan.

    Function-scoped: pytest-asyncio pairs a fixture with an event loop of
    matching scope, and a module-scoped fixture against a function-scoped
    loop raises ScopeMismatch.

    Because the lifespan never runs, LOADED and TABLES stay empty. Use this
    for routing, validation and error-path tests that must not depend on
    model artifacts being present on disk. Endpoints needing a loaded model
    return 404 here, by design.

    httpx 0.28 removed the `app=` shortcut, hence the explicit transport.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
async def live_client():
    """Client WITH the lifespan handler run: models and feature store loaded.

    Use for tests that exercise real inference. Skips when the artifacts are
    missing, since load_models() raises rather than serving an empty app --
    a fresh clone without the pkl files should not report failures it cannot
    fix.
    """
    if LifespanManager is None:
        pytest.skip("asgi-lifespan not installed (pip install asgi-lifespan)")

    try:
        async with LifespanManager(app):
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://testserver"
            ) as client:
                yield client
    except RuntimeError as exc:
        pytest.skip(f"App failed to start: {exc}")


@pytest.fixture
def churn_features() -> dict:
    """A valid payload for the 12-feature churn contract.

    Categorical values must match the fitted encoder's vocabulary exactly;
    the API rejects anything else with a 400 rather than silently zeroing
    the column.
    """
    return {
        "age": 51,
        "gender": "Other",
        "subscription_type": "Basic",
        "watch_hours": 14.73,
        "last_login_days": 29,
        "region": "Africa",
        "device": "TV",
        "monthly_fee": 8.99,
        "payment_method": "Gift Card",
        "number_of_profiles": 1,
        "avg_watch_time_per_day": 0.49,
        "favorite_genre": "Action",
    }