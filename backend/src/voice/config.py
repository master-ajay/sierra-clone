from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    voice_api_key: str = "change-me"
    voice_db_path: str = "data/platform.db"
    voice_adp_url: str = "http://localhost:8000/adp"
    voice_adp_api_key: str = "change-me"
    voice_runtime_url: str = "http://localhost:8000/runtime"
    voice_runtime_api_key: str = "change-me"
    voice_trust_url: str = "http://localhost:8000/trust"
    voice_trust_api_key: str = "change-me"

    model_config = {"env_file": ".env", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
