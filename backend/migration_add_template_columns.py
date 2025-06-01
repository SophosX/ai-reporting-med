from sqlalchemy import create_engine, text
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add template_id and template_text columns to reports table"""
    try:
        # Create engine
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        
        # Add columns
        with engine.connect() as connection:
            # Add template_id column
            connection.execute(text("""
                ALTER TABLE reports 
                ADD COLUMN template_id VARCHAR(50) NULL
            """))
            
            # Add template_text column
            connection.execute(text("""
                ALTER TABLE reports 
                ADD COLUMN template_text TEXT NULL
            """))
            
            connection.commit()
            
        logger.info("Migration completed successfully")
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration() 