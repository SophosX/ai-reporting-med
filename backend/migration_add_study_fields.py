"""
Migration script to add study-related fields to users table
"""
import os
import sys
from sqlalchemy import create_engine, text
import logging

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add study-related columns to users table"""
    
    # Create engine
    database_url = settings.SQLALCHEMY_DATABASE_URI
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Check if columns already exist
            existing_columns = conn.execute(text(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE()"
            )).fetchall()
            existing_column_names = [col[0] for col in existing_columns]
            
            # Add study_participant column
            if 'study_participant' not in existing_column_names:
                logger.info("Adding 'study_participant' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN study_participant BOOLEAN DEFAULT FALSE"
                ))
                conn.commit()
                logger.info("'study_participant' column added successfully")
            else:
                logger.info("'study_participant' column already exists")
            
            # Add study_token column
            if 'study_token' not in existing_column_names:
                logger.info("Adding 'study_token' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN study_token VARCHAR(255)"
                ))
                conn.commit()
                logger.info("'study_token' column added successfully")
            else:
                logger.info("'study_token' column already exists")
            
            # Add experience_level column
            if 'experience_level' not in existing_column_names:
                logger.info("Adding 'experience_level' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN experience_level VARCHAR(50)"
                ))
                conn.commit()
                logger.info("'experience_level' column added successfully")
            else:
                logger.info("'experience_level' column already exists")
            
            # Add full_name column
            if 'full_name' not in existing_column_names:
                logger.info("Adding 'full_name' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN full_name VARCHAR(255)"
                ))
                conn.commit()
                logger.info("'full_name' column added successfully")
            else:
                logger.info("'full_name' column already exists")
            
            # Add study_mode_active column for current session status
            if 'study_mode_active' not in existing_column_names:
                logger.info("Adding 'study_mode_active' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN study_mode_active BOOLEAN DEFAULT FALSE"
                ))
                conn.commit()
                logger.info("'study_mode_active' column added successfully")
            else:
                logger.info("'study_mode_active' column already exists")
            
            logger.info("Study fields migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration()