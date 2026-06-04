from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://proofpath:proofpath@localhost:5432/proofpath"
    database_url_sync: str = "postgresql://proofpath:proofpath@localhost:5432/proofpath"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"
    clerk_jwt_issuer: str = ""
    anthropic_api_key: str = ""
    paid_signing_key_path: str = "./keys/paid_private.pem"
    paid_verification_key_path: str = "./keys/paid_public.pem"
    platform_version: str = "0.1.0"
    verify_base_url: str = "http://localhost:3000/verify"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
