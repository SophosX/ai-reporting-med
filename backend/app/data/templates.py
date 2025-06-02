from ..models.template_model import UserTemplate
from ..models.user_model import User  # Import User model to resolve SQLAlchemy relationships
from sqlalchemy.orm import Session
import logging

# Configure logging
logger = logging.getLogger(__name__)

# This file contains the radiological report templates

radiologyTemplates = [
    {
        "id": "roentgen-thorax",
        "title": "Röntgen Thorax",
        "text": """**UNTERSUCHUNG:** Röntgen Thorax in zwei Ebenen

**TECHNIK:** Konventionelle Röntgenaufnahme des Thorax in posterior-anteriorer und seitlicher Projektion

**BEFUND:**
• Keine pneumonischen Infiltrate
• Keine Pleuraergüsse
• Kein Pneumothorax
• Normalgroße Herzsilhouette ohne Zeichen der pulmonalvenösen Stauung
• Mittelständiges schlankes Mediastinum mit regelrechter Hiluskonfiguration
• Mitabgebildeter Weichteilmantel unauffällig
• Unauffällige Darstellung des miterfassten Achsenskeletts

**BEURTEILUNG:**
Regelrechter Röntgen-Thoraxbefund ohne pathologische Veränderungen."""
    },
    {
        "id": "ct-thorax",
        "title": "CT Thorax",
        "text": """**UNTERSUCHUNG:** CT Thorax nativ und nach i.v. Kontrastmittelgabe

**TECHNIK:** Spiral-CT des Thorax in kraniokaudaler Richtung mit 1,25mm Schichtdicke

**BEFUND:**

*Lunge:*
• Beidseits regelrecht belüftete Lungenflügel
• Keine relevanten Belüftungsstörungen
• Keine pneumonischen Infiltrate
• Keine malignomsuspekten intrapulmonalen Rundherde
• Kein Pleuraerguss
• Kein Pneumothorax

*Herz und Gefäße:*
• Normgroßes Herz, kein Perikarderguss
• Regelrechte Darstellung der großen intrathorakalen Gefäße

*Mediastinum:*
• Keine thorakale Lymphadenopathie

*Miterfasste Strukturen:*
• Unauffällige Darstellung der miterfassten Oberbauchorgane
• Unauffällige Darstellung des miterfassten Achsenskeletts
• Unauffällige Darstellung der miterfassten Weichteile

**BEURTEILUNG:**
Unauffälliger CT-Thorax ohne pathologische Veränderungen."""
    },
    {
        "id": "ct-abdomen",
        "title": "CT Abdomen",
        "text": """**UNTERSUCHUNG:** CT Abdomen nativ und nach i.v. Kontrastmittelgabe

**TECHNIK:** Spiral-CT des Abdomens und Beckens mit i.v. Kontrastmittel in arterieller und venöser Phase

**BEFUND:**

*Leber und Gallenwege:*
• Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen
• Regelrechte Kontrastierung der venösen und portalvenösen Gefäße
• Arterieller Normalversorgungstyp
• Keine intra- oder extrahepatische Cholestase
• Unauffällige Gallenblase

*Pankreas und Milz:*
• Regelrechte Darstellung der Milz und des Pankreas
• Regelrechte Darstellung der Nebennieren

*Urogenitaltrakt:*
• Regelrechte Darstellung der Nieren, kein Harnstau
• Harnblase unauffällig
• Regelrechte Darstellung der Organe im kleinen Becken

*Darm:*
• Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm
• Keine Passagestörung

*Gefäße:*
• Regelrechte Kontrastierung der abgebildeten Gefäßabschnitte

*Peritoneum und Lymphknoten:*
• Keine freie intraabdominale Flüssigkeit
• Keine freie Luft
• Keine abdominelle Lymphadenopathie

*Skelett und Weichteile:*
• Unauffällige Darstellung des miterfassten Achsenskeletts
• Unauffällige Darstellung der miterfassten Weichteile

**BEURTEILUNG:**
Unauffälliger CT-Abdomen-Befund ohne pathologische Veränderungen."""
    },
    {
        "id": "mrt-abdomen",
        "title": "MRT Abdomen",
        "text": """**UNTERSUCHUNG:** MRT Abdomen nativ und nach i.v. Kontrastmittelgabe

**TECHNIK:** MRT des Abdomens in T1-, T2- und STIR-Wichtung nativ sowie T1-Wichtung nach i.v. Gadolinium-Gabe

**BEFUND:**

*Leber:*
• Regelrechte Größe und Signalintensität der Leber
• Homogene Kontrastmittelaufnahme
• Keine fokalen Läsionen
• Regelrechte Darstellung der intrahepatischen Gallenwege

*Gallenblase und Gallenwege:*
• Unauffällige Gallenblase
• Keine Cholestase

*Pankreas:*
• Regelrechte Größe und Signalintensität
• Homogene Kontrastmittelaufnahme
• Regelrechter Pankreasgang

*Milz:*
• Regelrechte Größe und Signalintensität

*Nebennieren:*
• Beidseits unauffällige Nebennieren

*Nieren:*
• Regelrechte Größe und Signalintensität beider Nieren
• Homogene Kontrastmittelaufnahme
• Kein Harnstau

*Retroperitoneum:*
• Keine vergrößerten Lymphknoten
• Regelrechte Darstellung der großen Gefäße

*Beckenorgane:*
• Regelrechte Darstellung der Beckenorgane

**BEURTEILUNG:**
Unauffälliger MRT-Abdomen-Befund ohne pathologische Veränderungen."""
    },
    {
        "id": "mrt-schulter",
        "title": "MRT Schulter",
        "text": """**UNTERSUCHUNG:** MRT der rechten/linken Schulter

**TECHNIK:** MRT der Schulter in koronaren, sagittalen und axialen Schnittebenen in T1-, T2- und PD-Wichtung

**BEFUND:**

*Glenohumeralgelenk:*
• Regelrechte Artikulation des normal konfigurierten Oberarmkopfes in der regelhaft ausgebildeten Pfanne
• Glatte Gelenkflächen bei normal breiter Kortikalis
• Regelrecht weiter Gelenkspalt
• Homogenes, fettäquivalentes Knochenmarksignal

*Labrum glenoidale:*
• Das Labrum glenoidale ist allseits intakt

*Akromioklavikulargelenk:*
• Normale Konfiguration des Akromioklavikulargelenks
• Keine Gelenkhypertrophie
• Subakromiales Fettgewebe erhalten

*Rotatorenmanschette:*
• Regelrechte Darstellung der die Rotatorenmanschette bildenden Muskulatur
• M. supraspinatus: regelrechte Lage, Breite und Signalgebung mit normalem Muskel-Sehnen-Übergang
• M. infraspinatus, M. teres minor und M. subscapularis: unauffällig

*Bizepssehne:*
• Reguläre Abbildung der intakten Bizepssehne mit normalem Verlauf im Canalis bicipitis

*Weitere Strukturen:*
• Unauffällige Darstellung der übrigen das Schultergelenk deckenden Muskulatur
• Unauffällige Darstellung der mitdargestellten Lungenabschnitte und Weichteile

**BEURTEILUNG:**
Unauffälliger MRT-Schulter-Befund ohne pathologische Veränderungen."""
    }
]

def get_template_by_id(template_id: str, db: Session = None, user_id: int = None):
    """Get a template by its ID from the database"""
    if not db:
        return None
        
    # First check for user-specific override
    if user_id:
        user_template = db.query(UserTemplate).filter(
            UserTemplate.template_id == template_id,
            UserTemplate.user_id == user_id
        ).first()
        
        if user_template:
            return {
                "id": user_template.template_id,
                "title": user_template.title,
                "text": user_template.text,
                "user_created": user_template.user_id != 1,
                "is_default_override": user_template.is_default_override,
                "default_template_id": user_template.default_template_id if user_template.is_default_override else None,
                "template_db_id": user_template.id
            }
    
    # If no user-specific template found, get the default template
    template = db.query(UserTemplate).filter(
        UserTemplate.template_id == template_id,
        UserTemplate.user_id == 1,  # Default templates have user_id=1
        UserTemplate.is_default_override == False  # Only get original default templates
    ).first()
    
    if not template:
        return None
        
    return {
        "id": template.template_id,
        "title": template.title,
        "text": template.text,
        "user_created": False,
        "is_default_override": False,
        "default_template_id": None,
        "template_db_id": template.id
    }

def get_all_templates(db: Session = None, user_id: int = None):
    """Get all available templates from the database"""
    if not db:
        return []
        
    templates = []
    
    # Get all default templates
    default_templates = db.query(UserTemplate).filter(
        UserTemplate.user_id == 1,  # Default templates have user_id=1
        UserTemplate.is_default_override == False  # Only get original default templates
    ).all()
    
    # Get user-specific overrides and custom templates if user_id is provided
    user_overrides = {}
    if user_id:
        # Get overrides
        overrides = db.query(UserTemplate).filter(
            UserTemplate.user_id == user_id,
            UserTemplate.is_default_override == True
        ).all()
        
        # Create a mapping of default_template_id to override
        for override in overrides:
            user_overrides[override.default_template_id] = override
            
        # Get custom templates (not overrides)
        custom_templates = db.query(UserTemplate).filter(
            UserTemplate.user_id == user_id,
            UserTemplate.is_default_override == False
        ).all()
        
        # Add custom templates to the list
        for template in custom_templates:
            templates.append({
                "id": template.template_id,
                "title": template.title,
                "text": template.text,
                "user_created": True,
                "is_default_override": False,
                "template_db_id": template.id,
                "default_template_id": None
            })
    
    # Combine default templates with user overrides
    for template in default_templates:
        # Check if there's a user override for this template
        if template.template_id in user_overrides:
            override = user_overrides[template.template_id]
            templates.append({
                "id": override.template_id,
                "title": override.title,
                "text": override.text,
                "user_created": True,
                "is_default_override": True,
                "template_db_id": override.id,
                "default_template_id": template.template_id
            })
        else:
            templates.append({
                "id": template.template_id,
                "title": template.title,
                "text": template.text,
                "user_created": False,
                "is_default_override": False,
                "template_db_id": template.id,
                "default_template_id": None
            })
    
    return templates

def update_default_template(template_id: str, title=None, text=None):
    """Update a default template"""
    try:
        for i, template in enumerate(radiologyTemplates):
            if template["id"] == template_id:
                # Update the template
                if title is not None:
                    radiologyTemplates[i]["title"] = title
                if text is not None:
                    radiologyTemplates[i]["text"] = text
                return radiologyTemplates[i]
        return None
    except Exception as e:
        logger.error(f"Error updating default template: {e}")
        return None

def delete_default_template(template_id: str):
    """
    DEPRECATED: This function is no longer used.
    The restore functionality for templates has been removed from the application.
    Standard templates and their overrides cannot be deleted or reset.
    """
    logger.warning("Attempted to delete or reset template - this operation is no longer supported")
    return False

def import_default_templates(db: Session):
    """Import default templates into the database if they don't exist and remove templates that are no longer in the array"""
    
    # Get current template IDs from the radiologyTemplates array
    current_template_ids = {template["id"] for template in radiologyTemplates}
    
    # Import or update templates
    for template in radiologyTemplates:
        # Check if template already exists as a default template (user_id=1)
        existing = db.query(UserTemplate).filter(
            UserTemplate.template_id == template["id"],
            UserTemplate.user_id == 1,  # Must check for default user
            UserTemplate.is_default_override == False
        ).first()
        
        if existing:
            # Update existing template with new content
            logger.info(f"Updating existing default template: {template['id']}")
            existing.title = template["title"]
            existing.text = template["text"]
        else:
            # Create new template in database
            logger.info(f"Creating new default template: {template['id']}")
            new_template = UserTemplate(
                user_id=1,  # Use admin user ID
                title=template["title"],
                template_id=template["id"],
                text=template["text"],
                is_default_override=False
            )
            db.add(new_template)
    
    # Find and remove templates that are no longer in the radiologyTemplates array
    # Get all existing default templates from database
    existing_default_templates = db.query(UserTemplate).filter(
        UserTemplate.user_id == 1,
        UserTemplate.is_default_override == False
    ).all()
    
    # Check which templates need to be removed
    for existing_template in existing_default_templates:
        if existing_template.template_id not in current_template_ids:
            logger.info(f"Removing template '{existing_template.template_id}' as it's no longer in the default templates array")
            
            # Delete the default template
            db.delete(existing_template)
            
            # Also delete all user overrides for this template
            user_overrides = db.query(UserTemplate).filter(
                UserTemplate.default_template_id == existing_template.template_id,
                UserTemplate.is_default_override == True
            ).all()
            
            for override in user_overrides:
                logger.info(f"Removing user override for template '{existing_template.template_id}' (user: {override.user_id})")
                db.delete(override)
    
    try:
        db.commit()
        logger.info("Default templates synchronized successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Error synchronizing default templates: {e}")
        raise

def update_all_templates_formatting(db: Session):
    """Update all existing templates with the new formatting - this will affect all users"""
    logger.info("Starting formatting update for all templates...")
    
    # Get all default templates that need updating
    for template_data in radiologyTemplates:
        # Update the default template (user_id=1)
        default_template = db.query(UserTemplate).filter(
            UserTemplate.template_id == template_data["id"],
            UserTemplate.user_id == 1,
            UserTemplate.is_default_override == False
        ).first()
        
        if default_template:
            logger.info(f"Updating formatting for default template: {template_data['id']}")
            default_template.title = template_data["title"]
            default_template.text = template_data["text"]
        
        # Find ALL user overrides for this template and force update them
        user_overrides = db.query(UserTemplate).filter(
            UserTemplate.default_template_id == template_data["id"],
            UserTemplate.is_default_override == True
        ).all()
        
        for override in user_overrides:
            # Force update ALL user overrides regardless of customization
            logger.info(f"Force updating user override for template {template_data['id']} (user: {override.user_id})")
            override.title = template_data["title"]
            override.text = template_data["text"]
    
    try:
        db.commit()
        logger.info("Template formatting update completed successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating template formatting: {e}")
        raise