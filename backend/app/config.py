from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    FRONTEND_URL: str = "http://localhost:3000"

    # Hotmart
    HOTMART_HOTTOK: str = ""          # Token de verificação do webhook Hotmart

    # E-mail (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""               # Ex: "Equalizador PQ <no-reply@seudominio.com>"

    class Config:
        env_file = ".env"


settings = Settings()
