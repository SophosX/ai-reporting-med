#!/usr/bin/env python3
"""
Standalone script to import new default templates into the database
Run this script when you add new templates to the radiologyTemplates array
"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import logging
from app.core.database import SessionLocal
from app.data.templates import import_default_templates

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Import default templates into the database"""
    try:
        logger.info("Starting template import...")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Import templates
            import_default_templates(db)
            logger.info("✅ Templates imported successfully!")
            print("✅ All new templates have been imported to the database")
            
        except Exception as e:
            logger.error(f"❌ Error importing templates: {e}")
            print(f"❌ Error: {e}")
            return 1
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        print(f"❌ Database connection error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    print("=" * 60)
    print("IMPORTING DEFAULT TEMPLATES")
    print("=" * 60)
    exit_code = main()
    print("=" * 60)
    sys.exit(exit_code) 