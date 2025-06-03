#!/usr/bin/env python3
"""
Debug script to trace the import process step by step
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

def debug_import():
    """Debug the import process step by step"""
    try:
        logger.info("Starting debug import process...")
        
        # Create database session
        db = SessionLocal()
        
        try:
            missing_templates = ['ct-abdomen', 'mrt-schulter']
            
            for template_id in missing_templates:
                print(f"\n🔍 Debugging template: {template_id}")
                
                # Find the template in the radiologyTemplates array
                template_data = None
                for template in radiologyTemplates:
                    if template["id"] == template_id:
                        template_data = template
                        break
                
                if not template_data:
                    print(f"  ❌ Template {template_id} not found in radiologyTemplates array!")
                    continue
                
                print(f"  📝 Template data found: {template_data['title']}")
                
                # Check if template exists with different criteria
                print(f"  🔎 Checking existing templates with template_id = '{template_id}':")
                
                # Check all possible combinations
                all_matching = db.query(UserTemplate).filter(
                    UserTemplate.template_id == template_id
                ).all()
                
                print(f"    - Total with this template_id: {len(all_matching)}")
                for existing in all_matching:
                    print(f"      • user_id: {existing.user_id}, is_default_override: {existing.is_default_override}")
                
                # Check the specific filter used in import (updated to match fixed templates.py)
                existing = db.query(UserTemplate).filter(
                    UserTemplate.template_id == template_id,
                    UserTemplate.user_id == 1,  # Must check for default user
                    UserTemplate.is_default_override == False
                ).first()
                
                print(f"    - Matches import filter (is_default_override=False): {'Yes' if existing else 'No'}")
                
                if not existing:
                    print(f"  ✅ Template should be imported")
                    
                    # Try to create the template
                    try:
                        new_template = UserTemplate(
                            user_id=1,
                            title=template_data["title"],
                            template_id=template_data["id"],
                            text=template_data["text"],
                            is_default_override=False
                        )
                        db.add(new_template)
                        db.flush()  # Try to flush to see if there are any constraint issues
                        print(f"  ✅ Template added to session successfully")
                        
                    except Exception as e:
                        print(f"  ❌ Error adding template to session: {e}")
                        db.rollback()
                else:
                    print(f"  ⚠️  Template already exists, skipping")
            
            # Try to commit all changes
            try:
                db.commit()
                print(f"\n✅ Database commit successful")
            except Exception as e:
                print(f"\n❌ Database commit failed: {e}")
                db.rollback()
                
        except Exception as e:
            logger.error(f"❌ Error during debug import: {e}")
            print(f"❌ Debug error: {e}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        print(f"❌ Database connection error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("DEBUGGING IMPORT PROCESS")
    print("=" * 60)
    debug_import()
    print("=" * 60) 