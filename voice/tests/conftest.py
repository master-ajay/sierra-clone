from pathlib import Path

import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response
from voice.config import Settings, get_settings
from voice.database import run_migrations
from voice.main import app

TEST_API_KEY = "test-key-123"


@pytest.fixture(autouse=True)
def mock_adp_user_create():
    """Mock ADP user creation so line tests don't need a live ADP service."""
    import uuid

    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-adp/v1/users").mock(
            side_effect=lambda req: Response(201, json={"user_id": str(uuid.uuid4()), "display_name": "mocked"})
        )
        yield mock


@pytest.fixture()
def settings(tmp_path: Path) -> Settings:
    db_path = str(tmp_path / "test.db")
    run_migrations(db_path)
    return Settings(
        voice_api_key=TEST_API_KEY,
        voice_db_path=db_path,
        voice_adp_url="http://mock-adp",
        voice_adp_api_key="adp-key",
        voice_runtime_url="http://mock-runtime",
        voice_runtime_api_key="runtime-key",
        voice_trust_url="http://mock-trust",
        voice_trust_api_key="trust-key",
    )


@pytest.fixture()
def client(settings: Settings) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def api_key() -> str:
    return TEST_API_KEY
