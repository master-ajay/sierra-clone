from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from trust.config import Settings, get_settings
from trust.database import run_migrations
from trust.main import app

TEST_API_KEY = "test-key-123"


@pytest.fixture()
def test_db(tmp_path: Path) -> str:
    db_path = str(tmp_path / "test.db")
    run_migrations(db_path)
    return db_path


@pytest.fixture()
def client(test_db: str) -> TestClient:
    settings = Settings(trust_api_key=TEST_API_KEY, trust_db_path=test_db)
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def api_key() -> str:
    return TEST_API_KEY
