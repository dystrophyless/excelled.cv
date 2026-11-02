from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
    secret_key: SecretStr

    database_url: str

    resend_api_key: SecretStr
    resend_from_email: str = "onboarding@resend.dev"

    access_token_expire_minutes: int = 30

    # Origin the SPA is served from; state-changing requests must come from it.
    frontend_origin: str = "http://localhost:5173"
    # "development" relaxes the Secure cookie flag (plain-HTTP localhost).
    environment: Literal["development", "production"] = "production"
    session_days: int = 30


settings = Settings()
