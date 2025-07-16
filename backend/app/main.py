from fastapi import FastAPI
from .core.database import Base, engine
from .routers import auth, reports, templates, user_templates, custom_prompt, study
from fastapi.middleware.cors import CORSMiddleware
import logging
from .core.config import settings
import os
import importlib.util
import sys
from .core.init_db import init_db
from .core.database import get_db
from dotenv import load_dotenv

# Import all models to ensure SQLAlchemy can resolve relationships
from .models import User, UserTemplate, Report, StudySession

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run database migration scripts"""
    try:
        # Path to the template columns migration script
        template_migration_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "migration_add_template_columns.py"
        )
        
        # Path to the override columns migration script
        override_migration_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "migration_add_override_columns.py"
        )
        
        # Path to the custom prompt migration script
        custom_prompt_migration_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "migration_add_custom_prompt_column.py"
        )
        
        # Run template columns migration first
        if os.path.exists(template_migration_path):
            logger.info(f"Running template migration script: {template_migration_path}")
            
            # Load and run the migration script
            spec = importlib.util.spec_from_file_location("template_migration", template_migration_path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            
            # Run the migration
            migration.run_migration()
            logger.info("Template migration completed")
        
        # Run override columns migration second
        if os.path.exists(override_migration_path):
            logger.info(f"Running override migration script: {override_migration_path}")
            
            # Load and run the migration script
            spec = importlib.util.spec_from_file_location("override_migration", override_migration_path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            
            # Run the migration
            migration.run_migration()
            logger.info("Override migration completed")
        
        # Run custom prompt migration third
        if os.path.exists(custom_prompt_migration_path):
            logger.info(f"Running custom prompt migration script: {custom_prompt_migration_path}")
            
            # Load and run the migration script
            spec = importlib.util.spec_from_file_location("custom_prompt_migration", custom_prompt_migration_path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            
            # Run the migration
            migration.run_migration()
            logger.info("Custom prompt migration completed")
        
        if not os.path.exists(template_migration_path) and not os.path.exists(override_migration_path) and not os.path.exists(custom_prompt_migration_path):
            logger.info("No migration scripts found")
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        # Don't raise the exception to allow the app to continue
        # raise

def create_app():
    app = FastAPI(title=settings.PROJECT_NAME + " API")

    # Read allowed origins from environment variable, or use defaults
    cors_origins_env = settings.CORS_ORIGINS
    print(f"CORS_ORIGINS: {cors_origins_env}")
    # If CORS_ORIGINS is set and not empty, parse it as a comma-separated list
    if cors_origins_env:
        origins = [origin.strip() for origin in cors_origins_env.split(",")]
    else:
        # Default allowed origins for development and production
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "https://report.alexanderfesl.com",  # Add your production frontend URL
        ]
    
    logger.info(f"CORS allowed origins: {origins}")

    # Add CORS middleware FIRST, before other operations
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "*",  # Allow all headers for simplicity
        ],
        expose_headers=["*"],
        max_age=86400,  # 24 hours
    )

    # Run migrations before creating tables
    run_migrations()

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

    # Initialize database with default data
    try:
        db = next(get_db())
        init_db(db)
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

    # Router/Endpoints
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(templates.router, prefix="/templates", tags=["templates"])
    app.include_router(user_templates.router, prefix="/user-templates", tags=["user-templates"])
    app.include_router(custom_prompt.router, prefix="/custom-prompt", tags=["custom-prompt"])
    app.include_router(study.router, prefix="/study", tags=["study"])

    logger.info("Application startup complete")
    return app

app = create_app()

@app.get("/")
async def root():
    return {"message": "Welcome to the Medical Report Generator API"}

@app.get("/health")
async def health_check():
    """Simple health check endpoint to test CORS"""
    return {"status": "ok", "message": "CORS test endpoint"}