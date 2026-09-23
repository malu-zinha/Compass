from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # Compass/back


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    openai_api_key: SecretStr
    assemblyai_api_key: SecretStr
    jwt_secret: SecretStr
    jwt_expires_minutes: int = 720
    cors_origins: list[str] = ["http://localhost:3000"]
    data_dir: Path = BASE_DIR / "data"
    max_upload_mb: int = 200
    max_avatar_mb: int = 2
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 120
    assemblyai_streaming_model: str = "universal-streaming-multilingual"
    signed_url_ttl_seconds: int = 3600
    audio_retention_days: int = 0
    draft_ttl_hours: int = 24
    live_abandon_minutes: int = 10
    maintenance_interval_seconds: int = 300
    maintenance_enabled: bool = True
    log_level: str = "INFO"

    @field_validator("data_dir")
    @classmethod
    def _absolute(cls, v: Path) -> Path:
        return v if v.is_absolute() else (BASE_DIR / v).resolve()

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.data_dir / 'compass.db'}"

    @property
    def audio_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def avatar_dir(self) -> Path:
        return self.data_dir / "avatars"


@lru_cache
def get_settings() -> Settings:
    return Settings()
