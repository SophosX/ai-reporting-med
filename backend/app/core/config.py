from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = "Medical Reports"
    
    # Authentication settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Database settings
    SQLALCHEMY_DATABASE_URI: str
    
    # OpenAI settings
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4"
    
    # CORS settings
    CORS_ORIGINS: str = ""
    
    # Configure environment variables loading
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


# Create instance
settings = Settings()