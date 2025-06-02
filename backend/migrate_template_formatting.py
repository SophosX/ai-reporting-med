#!/usr/bin/env python3
"""
Migration script to update all existing templates with new formatting
This will update both default templates and user overrides that haven't been heavily customized
"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import logging
from app.core.database import SessionLocal
from app.data.templates import update_all_templates_formatting

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Run the template formatting migration"""
    try:
        logger.info("Starting template formatting migration...")
        print("🔄 Starting template formatting migration...")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Run the formatting update
            update_all_templates_formatting(db)
            logger.info("✅ Template formatting migration completed successfully!")
            print("✅ All templates have been updated with the new formatting!")
            print("\nChanges made:")
            print("- Added proper medical report structure (UNTERSUCHUNG, TECHNIK, BEFUND, BEURTEILUNG)")
            print("- Added bullet points for better readability")  
            print("- Fixed content errors (MRT Abdomen template)")
            print("- Improved visual hierarchy with markdown formatting")
            print("\n⚠️  Note: ALL templates have been force updated with the new formatting.")
            print("   Any previous user customizations have been replaced.")
            
        except Exception as e:
            logger.error(f"❌ Error during migration: {e}")
            print(f"❌ Migration failed: {e}")
            return 1
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        print(f"❌ Database connection error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 