from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from voice.config import Settings, get_settings
from voice.database import run_migrations
from voice.main import app

TEST_API_KEY = "test-key-123"


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
