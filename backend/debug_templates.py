#!/usr/bin/env python3
"""
Debug script to check templates in the database
"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import logging
from app.core.database import SessionLocal
from app.models.template_model import UserTemplate
from app.data.templates import radiologyTemplates

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_templates():
    """Debug templates in the database"""
    try:
        logger.info("Checking templates in database...")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Check what templates are defined in code
            print(f"\n📋 Templates defined in radiologyTemplates array: {len(radiologyTemplates)}")
            for i, template in enumerate(radiologyTemplates, 1):
                print(f"  {i}. {template['id']} - {template['title']}")
            
            # Check what templates exist in database
            all_templates = db.query(UserTemplate).filter(
                UserTemplate.user_id == 1,
                UserTemplate.is_default_override == False
            ).all()
            
            print(f"\n💾 Templates found in database: {len(all_templates)}")
            for template in all_templates:
                print(f"  - {template.template_id} - {template.title}")
            
            # Check for missing templates
            existing_ids = {t.template_id for t in all_templates}
            expected_ids = {t['id'] for t in radiologyTemplates}
            missing_ids = expected_ids - existing_ids
            
            if missing_ids:
                print(f"\n❌ Missing templates in database: {list(missing_ids)}")
            else:
                print(f"\n✅ All templates are present in database!")
            
            # Show total count
            total_templates = db.query(UserTemplate).count()
            print(f"\n📊 Total templates in database (all users): {total_templates}")
            
            return len(all_templates)
            
        except Exception as e:
            logger.error(f"❌ Error checking templates: {e}")
            print(f"❌ Database error: {e}")
            return -1
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        print(f"❌ Database connection error: {e}")
        return -1

if __name__ == "__main__":
    print("=" * 60)
    print("DEBUGGING TEMPLATE DATABASE")
    print("=" * 60)
    count = debug_templates()
    print("=" * 60)
    if count >= 0:
        print(f"Result: Found {count} default templates in database")
    else:
        print("Result: Database connection failed") 