
import pytest
from expert_answers.config import Settings, get_settings
from expert_answers.database import run_migrations
from expert_answers.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def tmp_db(tmp_path):
    db = str(tmp_path / "test.db")
    run_migrations(db)
    return db


@pytest.fixture
def settings(tmp_db):
    return Settings(expert_answers_api_key="test-key-123", expert_answers_db_path=tmp_db)


@pytest.fixture
def client(settings):
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def api_key(settings):
    return settings.expert_answers_api_key
