from fastapi import FastAPI
from .core.database import Base, engine
from .routers import auth, reports, templates, user_templates
from fastapi.middleware.cors import CORSMiddleware
import logging
from .core.config import settings
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = FastAPI(title=settings.PROJECT_NAME + " API")

    # Automatically create database tables (demo)
    logger.info("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully!")
        
        # List all tables
        table_names = Base.metadata.tables.keys()
        logger.info(f"Tables in the database: {', '.join(table_names)}")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Read allowed origins from environment variable, or use defaults
    cors_origins_env = os.getenv("CORS_ORIGINS", "")
    # If CORS_ORIGINS is set and not empty, parse it as a comma-separated list
    if cors_origins_env:
        origins = [origin.strip() for origin in cors_origins_env.split(",")]
    else:
        # Default allowed origins for development
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8000",
            "http://localhost:8000"
        ]
    
    logger.info(f"CORS allowed origins: {origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Router/Endpoints
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(templates.router, prefix="/templates", tags=["templates"])
    app.include_router(user_templates.router, prefix="/user-templates", tags=["user-templates"])

    logger.info("Application startup complete")
    return app

app = create_app()