"""
Migration script to add default template override columns to user_templates table
Run this after updating the model but before using the new features
"""
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, MetaData, Table, text
from app.core.config import settings

def run_migration():
    try:
        # Create engine and connect
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        connection = engine.connect()
        metadata = MetaData()
        
        # Reflect the user_templates table
        user_templates = Table('user_templates', metadata, autoload_with=engine)
        
        # Check if the columns already exist
        column_names = [column.name for column in user_templates.columns]
        
        if 'is_default_override' not in column_names:
            logger.info("Adding 'is_default_override' column to user_templates table")
            connection.execute(text('ALTER TABLE user_templates ADD COLUMN is_default_override BOOLEAN DEFAULT FALSE'))
            connection.commit()
        
        if 'default_template_id' not in column_names:
            logger.info("Adding 'default_template_id' column to user_templates table")
            connection.execute(text('ALTER TABLE user_templates ADD COLUMN default_template_id VARCHAR(255)'))
            connection.commit()
        
        connection.close()
        logger.info("Migration completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        if 'connection' in locals():
            connection.close()
        raise

if __name__ == "__main__":
    run_migration() 