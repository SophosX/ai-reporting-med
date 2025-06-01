from sqlalchemy.orm import Session
from ..data.templates import import_default_templates
import logging

logger = logging.getLogger(__name__)

def init_db(db: Session):
    """Initialize the database with default data"""
    try:
        # Import default templates
        import_default_templates(db)
        logger.info("Default templates imported successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise 