import uuid
from pathlib import Path

import httpx
import pytest
import respx
from channels.config import Settings, get_settings
from channels.database import run_migrations
from channels.main import app
from fastapi.testclient import TestClient

TEST_API_KEY = "test-key-123"
ADP_BASE = "http://localhost:8000/adp"


@pytest.fixture()
def test_db(tmp_path: Path) -> str:
    db_path = str(tmp_path / "test.db")
    run_migrations(db_path)
    return db_path


@pytest.fixture(autouse=True)
def mock_adp_user_registration():
    # create_channel registers a real ADP user for every channel it creates
    # (see channel_service.create_channel). Mocked here, once, for every
    # test - tests that need their own respx mocks (e.g. test_stats.py's
    # chat-flow tests) nest their own @respx.mock router on top of this one.
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"{ADP_BASE}/v1/users").mock(
            side_effect=lambda request: httpx.Response(201, json={"user_id": str(uuid.uuid4())})
        )
        yield mock


@pytest.fixture()
def client(test_db: str) -> TestClient:
    settings = Settings(
        channels_api_key=TEST_API_KEY,
        channels_db_path=test_db,
        channels_trust_url="http://localhost:8000/trust",
        channels_trust_api_key="trust-key",
    )
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def api_key() -> str:
    return TEST_API_KEY
