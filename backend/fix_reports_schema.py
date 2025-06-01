#!/usr/bin/env python3
"""
Standalone script to fix the reports table schema by adding missing template columns
Run this script if you're experiencing "Unknown column 'reports.template_id'" errors
"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, MetaData, Table
import logging
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_reports_schema():
    """Add missing template_id and template_text columns to reports table"""
    try:
        logger.info("Connecting to database...")
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        metadata = MetaData()
        
        with engine.connect() as connection:
            logger.info("Checking current reports table schema...")
            
            # Reflect the reports table to check existing columns
            reports = Table('reports', metadata, autoload_with=engine)
            column_names = [column.name for column in reports.columns]
            
            logger.info(f"Current columns in reports table: {column_names}")
            
            # Add template_id column if it doesn't exist
            if 'template_id' not in column_names:
                logger.info("Adding 'template_id' column to reports table...")
                connection.execute(text("""
                    ALTER TABLE reports 
                    ADD COLUMN template_id VARCHAR(50) NULL
                """))
                connection.commit()
                logger.info("'template_id' column added successfully")
            else:
                logger.info("'template_id' column already exists")
            
            # Add template_text column if it doesn't exist
            if 'template_text' not in column_names:
                logger.info("Adding 'template_text' column to reports table...")
                connection.execute(text("""
                    ALTER TABLE reports 
                    ADD COLUMN template_text TEXT NULL
                """))
                connection.commit()
                logger.info("'template_text' column added successfully")
            else:
                logger.info("'template_text' column already exists")
            
            # Verify the fix by checking columns again
            logger.info("Verifying schema fix...")
            metadata.clear()
            reports = Table('reports', metadata, autoload_with=engine)
            updated_column_names = [column.name for column in reports.columns]
            logger.info(f"Updated columns in reports table: {updated_column_names}")
            
        logger.info("Schema fix completed successfully!")
        logger.info("You can now restart your FastAPI server")
        
    except Exception as e:
        logger.error(f"Error fixing schema: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("REPORTS TABLE SCHEMA FIX")
    print("=" * 60)
    fix_reports_schema()
    print("=" * 60) 