from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    expert_answers_api_key: str = "change-me"
    expert_answers_db_path: str = "data/platform.db"
    expert_answers_adp_url: str = "http://localhost:8000/adp"
    expert_answers_adp_api_key: str = "change-me"
    expert_answers_runtime_url: str = "http://localhost:8000/runtime"
    expert_answers_runtime_api_key: str = "change-me"
    expert_answers_trust_url: str = "http://localhost:8000/trust"
    expert_answers_trust_api_key: str = "change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()
