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
        "text": """
UNTERSUCHUNG: CT Thorax nativ und nach KM-Gabe

Keine pneumonischen Infiltrate. Keine Pleuraergüsse. Kein Pneumothorax.

Normalgroße Herzsilhouette ohne Zeichen der pulmonalvenösen Stauung.

Mittelständiges schlankes Mediastinum mit regelrechter Hiluskonfiguration.

Mitabgebildeter Weichteilmantel unauffällig. Unauffällige Darstellung des miterfassten Achsenskeletts.
"""
    },
    {
        "id": "ct-thorax",
        "title": "CT Thorax",
        "text": """
Beidseits regelrecht belüftete Lungenflügel, keine relevanten Belüftungsstörungen. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax.
Keine malignomsuspekten intrapulmonalen Rundherde.
Normgroßes Herz. Kein Perikarderguss.
Regelrechte Darstellung der großen intrathorakalen Gefäße.
Keine thorakale Lymphadenopathie.
Unauffällige Darstellung der miterfassten Oberbauchorgane. Unauffällige Darstellung des miterfassten Achsenskeletts sowie der miterfassten Weichteile.
"""
    },
    {
        "id": "ct-abdomen",
        "title": "CT Abdomen",
        "text": """
Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen. Regelrechte Kontrastierung der venösen und portalvenösen Gefäße. Arterieller Normalversorgungstyp. Keine intra- oder extrahepatische Cholestase. Unauffällige Gallenblase. Regelrechte Darstellung der Milz, des Pancreas sowie der Nebennieren.

Regelrechte Darstellung der Nieren, kein Harnstau. Harnblase unauffällig.

Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm. Keine Passagestörung.

Regelrechte Darstellung der Organe im kleinen Becken.

Keine freie intraabdominale Flüssigkeit. Keine freie Luft. Keine abdominelle Lymphadenopathie.

Soweit in der aktuellen Phase abgrenzbar regelrechte Kontrastierung der abgebildeten Gefäßabschnitte.

Unauffällige Darstellung der miterfassten Oberbauchorgane. Unauffällige Darstellung des miterfassten Achsenskeletts sowie der miterfassten Weichteile.
"""
    },
    {
        "id": "mrt-adbomen",
        "title": "MRT Abdomen",
        "text": """
Regelrechte Artikulation des Kniegelenks. Kein Gelenkerguss. Regelrechte Kontur und Signalintentsität des Gelenkknorpels sowie der Menisci. Regelrechte Darstellung des vorderen und hinteren Kreuzbandes sowie des medialen und lateralen Kollateralbandes. Ebenfalls unauffällige Darstellung der Patellarsehne und der Retinacula patellae.

Nach Kontrastmittelapplikation zeigt sich keine auffällige Kontrastmittelanreicherung als Hinweis auf eine entzündliche Veränderung.

Altersentsprechende Epiphysenfugen. Regelrechte Signalintensität der abgebildeten Knochenmarksräume und der mitabgebildeten Weichteile, insbesondere kein Nachweis einer frischen knöchernen Verletzung.
"""
    },
    {
        "id": "mrt-schulter",
        "title": "MRT Schulter",
        "text": """
Regelrechte Artikulation des normal konfigurierten Oberarmkopfes in
der regelhaft ausgebildeten Pfanne. Glatte Gelenkflächen bei normal
breiter Kortikalis. Regelrecht weiter Gelenkspalt. Homogenes, fettäqui-
valentes Knochenmarksignal.
Das Labrum glenoidale ist allseits intakt.
Normale Konfiguration des Akromioklavikulargelenks. Keine Gelenkhy-
pertrophie. Subakromiales Fettgewebe erhalten.
Nach Konfiguration und Verlauf reguläre Darstellung der die Rotatoren-
manschette bildenden Muskulatur. Insbesondere stellt sich der M. su-
praspinatus nach Lage, Breite und Signalgebung ordnungsgemäß dar
mit normalem Muskel-Sehnen-Übergang.
Reguläre Abbildung der intakten Bizepssehne mit normalem Verlauf im
Canalis bicipitis.
Unauffällige Darstellung der übrigen das Schultergelenk deckenden
Muskulatur sowie der mitdargestellten Lungenabschnitte und Weich-
teile.
"""
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
            UserTemplate.is_default_override == False,
            UserTemplate.template_id.like('user-%')  # Only include user-created templates
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
    """Import default templates into the database if they don't exist"""
    for template in radiologyTemplates:
        # Check if template already exists
        existing = db.query(UserTemplate).filter(
            UserTemplate.template_id == template["id"],
            UserTemplate.is_default_override == False
        ).first()
        
        if not existing:
            # Create new template in database
            new_template = UserTemplate(
                user_id=1,  # Use admin user ID
                title=template["title"],
                template_id=template["id"],
                text=template["text"],
                is_default_override=False
            )
            db.add(new_template)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error importing default templates: {e}")
        raise