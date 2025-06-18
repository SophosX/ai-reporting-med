#!/usr/bin/env python3
"""
Migration script to update all standard templates with new content.
This script will:
1. Update all default templates (user_id=1) with new content
2. Handle the template ID change from 'mrt-adbomen' to 'mrt-knie'
3. Force update all user overrides to use the new template content
4. Create proper migration mappings for the template ID change

Run this script after updating the radiologyTemplates array in templates.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.template_model import UserTemplate
from app.models.user_model import User
from sqlalchemy.orm import Session
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# New template data matching the updated radiologyTemplates
NEW_TEMPLATES = [
    {
        "id": "roentgen-thorax",
        "title": "Röntgen Thorax",
        "text": """Keine pneumonischen Infiltrate. Keine Pleuraergüsse. Kein Pneumothorax. Normalgroße Herzsilhouette. Keine Zeichen der pulmonalvenösen Stauung. Mittelständiges schlankes Mediastinum mit regelrechter Hiluskonfiguration. Mitabgebildeter Weichteilmantel unauffällig. Unauffällige Darstellung des miterfassten Achsenskeletts."""
    },
    {
        "id": "ct-thorax",
        "title": "CT Thorax",
        "text": """Beidseits regelrecht belüftete Lungenflügel, keine relevanten Belüftungsstörungen. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax. Keine malignomsuspekten intrapulmonalen Rundherde. Normgroßes Herz. Kein Perikarderguss. Regelrechte Darstellung der großen intrathorakalen Gefäße. Keine thorakale Lymphadenopathie. Unauffällige Darstellung der miterfassten Oberbauchorgane. Unauffällige Darstellung des miterfassten Achsenskeletts sowie der miterfassten Weichteile."""
    },
    {
        "id": "ct-abdomen",
        "title": "CT Abdomen",
        "text": """Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen. Regelrechte Kontrastierung der venösen und portalvenösen Gefäße. Arterieller Normalversorgungstyp. Keine intra- oder extrahepatische Cholestase. Unauffällige Gallenblase. Regelrechte Darstellung der Milz, des Pancreas sowie der Nebennieren. Regelrechte Darstellung der Nieren, kein Harnstau. Harnblase unauffällig. Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm. Keine Passagestörung. Regelrechte Darstellung der Organe im kleinen Becken. Keine freie intraabdominale Flüssigkeit. Keine freie Luft. Keine abdominelle Lymphadenopathie. Soweit in der aktuellen Phase abgrenzbar regelrechte Kontrastierung der abgebildeten Gefäßabschnitte. Unauffällige Darstellung der miterfassten Oberbauchorgane. Unauffällige Darstellung des miterfassten Achsenskeletts sowie der miterfassten Weichteile."""
    },
    {
        "id": "mrt-knie",
        "title": "MRT Knie",
        "text": """Regelrechte Artikulation des Kniegelenks. Kein Gelenkerguss. Regelrechte Kontur und Signalintentsität des Gelenkknorpels sowie der Menisci. Regelrechte Darstellung des vorderen und hinteren Kreuzbandes sowie des medialen und lateralen Kollateralbandes. Ebenfalls unauffällige Darstellung der Patellarsehne und der Retinacula patellae. Nach Kontrastmittelapplikation zeigt sich keine auffällige Kontrastmittelanreicherung als Hinweis auf eine entzündliche Veränderung. Altersentsprechende Epiphysenfugen. Regelrechte Signalintensität der abgebildeten Knochenmarksräume und der mitabgebildeten Weichteile, insbesondere kein Nachweis einer frischen knöchernen Verletzung."""
    },
    {
        "id": "mrt-schulter",
        "title": "MRT Schulter",
        "text": """Regelrechte Artikulation des Glenohumeralgelenks. Normal konfigurierter Oberarmkopf. Regelrecht konfigurierte Pfanne. Glatte Gelenkflächen bei normal breiter Kortikalis. Regelrecht weiter Gelenkspalt. Homogenes, fettäquivalentes Knochenmarksignal. Labrum glenoidale allseits intakt. Normale Konfiguration des Akromioklavikulargelenks. Keine Gelenkhypertrophie. Subakromiales Fettgewebe erhalten. Regelrechte Darstellung der Rotatorenmanschette. M. supraspinatus mit normaler Lage, Breite, Signalgebung und normalem Muskel-Sehnen-Übergang. Intakte Bizepssehne mit regelrechtem Verlauf im Canalis bicipitis. Unauffällige Darstellung der das Schultergelenk deckenden Muskulatur. Unauffällige Darstellung der mitabgebildeten Lungenabschnitte. Unauffällige Darstellung der mitabgebildeten Weichteile."""
    }
]

def migrate_template_id_change(db: Session):
    """Handle the template ID change from mrt-adbomen to mrt-knie"""
    logger.info("=== Handling template ID change: mrt-adbomen -> mrt-knie ===")
    
    # Find the old default template (mrt-adbomen)
    old_default = db.query(UserTemplate).filter(
        UserTemplate.template_id == "mrt-adbomen",
        UserTemplate.user_id == 1,
        UserTemplate.is_default_override == False
    ).first()
    
    if old_default:
        logger.info("Found old 'mrt-adbomen' default template - updating to 'mrt-knie'")
        old_default.template_id = "mrt-knie"
        old_default.title = "MRT Knie"
        old_default.text = NEW_TEMPLATES[3]["text"]  # MRT Knie content
        
        # Find all user overrides for the old template ID
        user_overrides = db.query(UserTemplate).filter(
            UserTemplate.default_template_id == "mrt-adbomen",
            UserTemplate.is_default_override == True
        ).all()
        
        logger.info(f"Found {len(user_overrides)} user overrides for 'mrt-adbomen'")
        
        for override in user_overrides:
            logger.info(f"Updating override for user {override.user_id}: mrt-adbomen -> mrt-knie")
            override.template_id = "mrt-knie"
            override.default_template_id = "mrt-knie"
            override.title = "MRT Knie"
            override.text = NEW_TEMPLATES[3]["text"]  # Force update to new content
    else:
        # Create new mrt-knie template if mrt-adbomen doesn't exist
        logger.info("Old 'mrt-adbomen' template not found - creating new 'mrt-knie' template")
        new_template = UserTemplate(
            user_id=1,
            template_id="mrt-knie",
            title="MRT Knie",
            text=NEW_TEMPLATES[3]["text"],
            is_default_override=False
        )
        db.add(new_template)

def update_default_templates(db: Session):
    """Update all default templates with new content"""
    logger.info("=== Updating default templates with new content ===")
    
    for template_data in NEW_TEMPLATES:
        # Skip mrt-knie as it's handled in migrate_template_id_change
        if template_data["id"] == "mrt-knie":
            continue
            
        default_template = db.query(UserTemplate).filter(
            UserTemplate.template_id == template_data["id"],
            UserTemplate.user_id == 1,
            UserTemplate.is_default_override == False
        ).first()
        
        if default_template:
            logger.info(f"Updating default template: {template_data['id']}")
            default_template.title = template_data["title"]
            default_template.text = template_data["text"]
        else:
            logger.info(f"Creating new default template: {template_data['id']}")
            new_template = UserTemplate(
                user_id=1,
                template_id=template_data["id"],
                title=template_data["title"],
                text=template_data["text"],
                is_default_override=False
            )
            db.add(new_template)

def force_update_user_overrides(db: Session):
    """Force update all user overrides with new template content"""
    logger.info("=== Force updating all user overrides with new content ===")
    
    # Create a mapping of template data by ID for easy lookup
    template_map = {t["id"]: t for t in NEW_TEMPLATES}
    
    # Get all user overrides
    user_overrides = db.query(UserTemplate).filter(
        UserTemplate.is_default_override == True,
        UserTemplate.user_id != 1
    ).all()
    
    logger.info(f"Found {len(user_overrides)} user overrides to update")
    
    for override in user_overrides:
        # Skip deleted templates (marked with [DELETED])
        if override.title == "[DELETED]" and override.text == "[DELETED]":
            logger.info(f"Skipping deleted template override for user {override.user_id}")
            continue
            
        # Update with new content if template exists in our new templates
        if override.template_id in template_map:
            template_data = template_map[override.template_id]
            logger.info(f"Force updating override for user {override.user_id}, template {override.template_id}")
            override.title = template_data["title"]
            override.text = template_data["text"]
        else:
            logger.warning(f"No new content found for template {override.template_id} (user {override.user_id})")

def cleanup_orphaned_templates(db: Session):
    """Clean up any templates that are no longer in the standard set"""
    logger.info("=== Cleaning up orphaned templates ===")
    
    current_template_ids = {t["id"] for t in NEW_TEMPLATES}
    
    # Find default templates that are no longer in our standard set
    orphaned_defaults = db.query(UserTemplate).filter(
        UserTemplate.user_id == 1,
        UserTemplate.is_default_override == False,
        ~UserTemplate.template_id.in_(current_template_ids)
    ).all()
    
    for orphaned in orphaned_defaults:
        if orphaned.template_id != "mrt-adbomen":  # Skip mrt-adbomen as it's handled separately
            logger.info(f"Removing orphaned default template: {orphaned.template_id}")
            
            # Also remove related user overrides
            related_overrides = db.query(UserTemplate).filter(
                UserTemplate.default_template_id == orphaned.template_id,
                UserTemplate.is_default_override == True
            ).all()
            
            for override in related_overrides:
                logger.info(f"Removing orphaned override for template {orphaned.template_id} (user: {override.user_id})")
                db.delete(override)
            
            db.delete(orphaned)

def main():
    """Run the complete migration"""
    logger.info("Starting template migration...")
    
    db = SessionLocal()
    try:
        # Ensure admin user exists
        admin_user = db.query(User).filter(User.id == 1).first()
        if not admin_user:
            logger.error("Admin user (id=1) not found. Please create the admin user first.")
            return
        
        # Step 1: Handle template ID change (mrt-adbomen -> mrt-knie)
        migrate_template_id_change(db)
        
        # Step 2: Update all default templates with new content
        update_default_templates(db)
        
        # Step 3: Force update all user overrides
        force_update_user_overrides(db)
        
        # Step 4: Clean up orphaned templates
        cleanup_orphaned_templates(db)
        
        # Commit all changes
        db.commit()
        logger.info("✅ Template migration completed successfully!")
        
        # Print summary
        total_defaults = db.query(UserTemplate).filter(
            UserTemplate.user_id == 1,
            UserTemplate.is_default_override == False
        ).count()
        
        total_overrides = db.query(UserTemplate).filter(
            UserTemplate.is_default_override == True,
            UserTemplate.user_id != 1
        ).count()
        
        logger.info(f"📊 Migration Summary:")
        logger.info(f"   - Default templates: {total_defaults}")
        logger.info(f"   - User overrides: {total_overrides}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main() 