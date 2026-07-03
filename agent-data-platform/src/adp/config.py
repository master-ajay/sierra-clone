from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    adp_api_key: str = "change-me"
    adp_db_path: str = "data/adp.db"
    adp_host: str = "0.0.0.0"
    adp_port: int = 8100
    adp_log_level: str = "info"
    adp_max_context_tokens: int = 4096
    adp_default_page_size: int = 20

    model_config = {"env_file": ".env", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
