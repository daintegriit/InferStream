# backend/tests/conftest.py

import pytest
from httpx import AsyncClient
from main import app


@pytest.fixture(scope="module")
async def async_test_client():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
