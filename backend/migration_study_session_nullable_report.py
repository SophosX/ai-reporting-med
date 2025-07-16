import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Make report_id nullable in study_sessions table"""
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    
    try:
        with engine.connect() as conn:
            # Make report_id nullable
            logger.info("Making report_id nullable in study_sessions table...")
            conn.execute(text("""
                ALTER TABLE study_sessions 
                MODIFY COLUMN report_id INT NULL
            """))
            conn.commit()
            
            logger.info("Migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate()