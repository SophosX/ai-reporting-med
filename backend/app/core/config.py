from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = "Medical Reports"
    
    # Authentication settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours (8 * 60 minutes)
    
    # Database settings
    SQLALCHEMY_DATABASE_URI: str
    
    # AI Service Configuration
    AI_PROVIDER: str = "openai"  # "openai" or "azure"
    
    # OpenAI settings (for testing)
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"
    
    # Azure OpenAI settings (for production)
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_MODEL: str = "gpt-4o"
    AZURE_API_VERSION: str = "2025-01-01-preview"
    
    # CORS settings
    CORS_ORIGINS: str = ""
    
    # Configure environment variables loading
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


# Create instance
settings = Settings()