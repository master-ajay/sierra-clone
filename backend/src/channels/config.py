from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    channels_api_key: str = "change-me"
    channels_db_path: str = "data/platform.db"
    channels_host: str = "0.0.0.0"
    channels_port: int = 8200
    channels_adp_url: str = "http://localhost:8000/adp"
    channels_adp_api_key: str = "change-me"
    channels_runtime_url: str = "http://localhost:8000/runtime"
    channels_trust_url: str = "http://localhost:8000/trust"
    channels_trust_api_key: str = "change-me"

    model_config = {"env_file": ".env", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
