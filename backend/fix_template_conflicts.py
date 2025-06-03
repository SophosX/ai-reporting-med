#!/usr/bin/env python3
"""
Fix template conflicts by renaming user templates that conflict with default template IDs
"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import logging
from app.core.database import SessionLocal
from app.models.template_model import UserTemplate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_conflicts():
    """Fix template conflicts by renaming conflicting user templates"""
    try:
        logger.info("Fixing template conflicts...")
        
        # Create database session
        db = SessionLocal()
        
        try:
            conflicting_templates = ['ct-abdomen', 'mrt-schulter']
            
            for template_id in conflicting_templates:
                print(f"\n🔧 Fixing conflict for: {template_id}")
                
                # Find the conflicting template (not user_id=1)
                conflicting = db.query(UserTemplate).filter(
                    UserTemplate.template_id == template_id,
                    UserTemplate.user_id != 1  # Not default templates
                ).all()
                
                print(f"  📋 Found {len(conflicting)} conflicting templates")
                
                for template in conflicting:
                    old_id = template.template_id
                    new_id = f"user-{template.user_id}-{template_id}"
                    
                    print(f"  🔄 Renaming template:")
                    print(f"    User: {template.user_id}")
                    print(f"    Old ID: {old_id}")
                    print(f"    New ID: {new_id}")
                    
                    # Update the template ID
                    template.template_id = new_id
                    
                print(f"  ✅ Conflict resolved for {template_id}")
            
            # Commit changes
            db.commit()
            print(f"\n✅ All conflicts fixed! Default templates can now be imported.")
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error fixing conflicts: {e}")
            print(f"❌ Error: {e}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        print(f"❌ Database connection error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("FIXING TEMPLATE CONFLICTS")
    print("=" * 60)
    fix_conflicts()
    print("=" * 60) 