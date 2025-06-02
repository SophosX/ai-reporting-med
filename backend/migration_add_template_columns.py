from sqlalchemy import create_engine, text, MetaData, Table
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
        metadata = MetaData()
        
        # Add columns
        with engine.connect() as connection:
            # Reflect the reports table to check existing columns
            reports = Table('reports', metadata, autoload_with=engine)
            column_names = [column.name for column in reports.columns]
            
            # Add template_id column if it doesn't exist
            if 'template_id' not in column_names:
                logger.info("Adding 'template_id' column to reports table")
                connection.execute(text("""
                    ALTER TABLE reports 
                    ADD COLUMN template_id VARCHAR(50) NULL
                """))
                connection.commit()
            else:
                logger.info("'template_id' column already exists in reports table")
            
            # Add template_text column if it doesn't exist
            if 'template_text' not in column_names:
                logger.info("Adding 'template_text' column to reports table")
                connection.execute(text("""
                    ALTER TABLE reports 
                    ADD COLUMN template_text TEXT NULL
                """))
                connection.commit()
            else:
                logger.info("'template_text' column already exists in reports table")
            
        logger.info("Migration completed successfully")
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration() 