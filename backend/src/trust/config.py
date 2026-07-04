from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    trust_api_key: str = "change-me"
    trust_db_path: str = "data/platform.db"
    trust_host: str = "0.0.0.0"
    trust_port: int = 8500
    trust_rate_limit_rpm: int = 60
    trust_injection_block: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
