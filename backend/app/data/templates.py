from ..models.template_model import UserTemplate
from sqlalchemy.orm import Session
import logging

# Configure logging
logger = logging.getLogger(__name__)

# This file contains the radiological report templates

radiologyTemplates = [
    {
        "id": "ct-thorax",
        "title": "CT Thorax",
        "text": """
UNTERSUCHUNG: CT Thorax nativ und nach KM-Gabe

BEFUND:
1. Lunge:
   - Parenchym: 
   - Atemwege:
   - Pleura:

2. Mediastinum:
   - Herz:
   - Lymphknoten:
   - Große Gefäße:

3. Thoraxwand:
   - Knochen:
   - Weichteile:

BEURTEILUNG:
"""
    },
    {
        "id": "mrt-knie",
        "title": "MRT Knie",
        "text": """
UNTERSUCHUNG: MRT Kniegelenk rechts/links

BEFUND:
1. Bandapparat:
   - Kreuzbänder:
   - Kollateralbänder:

2. Menisci:
   - Innenmeniskus:
   - Außenmeniskus:

3. Knorpel:
   - Femorotibial:
   - Patellofemoral:

4. Knochen:
   - Frakturen:
   - Bone bruise:
   - Sonstige Signalveränderungen:

5. Weichteile:
   - Muskulatur:
   - Sehnen:

BEURTEILUNG:
"""
    },
    {
        "id": "xray-thorax",
        "title": "Röntgen Thorax",
        "text": """
UNTERSUCHUNG: Röntgen Thorax p.a./a.p. und seitlich

BEFUND:
1. Lunge:
   - Parenchym:
   - Gefäßzeichnung:
   - Pleura:

2. Mediastinum:
   - Herzgröße:
   - Herzform:
   - Aorta:
   - Hili:

3. Zwerchfell und Recessus:

4. Skelett:
   - Rippen:
   - Wirbelsäule:

BEURTEILUNG:
"""
    }
]

def get_template_by_id(template_id: str, db: Session = None, user_id: int = None):
    """Get a template by its ID, from either predefined or user templates"""
    # First check user templates if db and user_id are provided
    if db and user_id:
        # Check for user template with this ID
        user_template = db.query(UserTemplate).filter(
            UserTemplate.template_id == template_id,
            UserTemplate.user_id == user_id
        ).first()
        
        if user_template:
            return {
                "id": user_template.template_id,
                "title": user_template.title,
                "text": user_template.text,
                "user_created": True,
                "is_default_override": user_template.is_default_override,
                "default_template_id": user_template.default_template_id if user_template.is_default_override else None,
                "template_db_id": user_template.id
            }
        
        # Check for user override of a default template
        for default_template in radiologyTemplates:
            if default_template["id"] == template_id:
                # Check if user has an override for this default template
                override = db.query(UserTemplate).filter(
                    UserTemplate.default_template_id == template_id,
                    UserTemplate.user_id == user_id,
                    UserTemplate.is_default_override == True
                ).first()
                
                if override:
                    return {
                        "id": override.template_id,
                        "title": override.title,
                        "text": override.text,
                        "user_created": True,
                        "is_default_override": True,
                        "default_template_id": override.default_template_id,
                        "template_db_id": override.id
                    }
                else:
                    # Return the default template
                    return default_template.copy()
    
    # If no user override, check predefined templates
    for template in radiologyTemplates:
        if template["id"] == template_id:
            return template.copy()
    
    return None

def get_all_templates(db: Session = None, user_id: int = None):
    """Get all available templates, including user templates if specified"""
    templates = []
    user_overrides = {}
    
    # Add user templates and collect overrides if db and user_id are provided
    if db and user_id:
        try:
            user_templates = db.query(UserTemplate).filter(UserTemplate.user_id == user_id).all()
            
            for ut in user_templates:
                if ut.is_default_override:
                    # Add to overrides dict by default template ID
                    user_overrides[ut.default_template_id] = {
                        "id": ut.template_id,
                        "title": ut.title,
                        "text": ut.text,
                        "user_created": True,
                        "is_default_override": True,
                        "template_db_id": ut.id,
                        "original_default_id": ut.default_template_id
                    }
                else:
                    # Regular user template
                    templates.append({
                        "id": ut.template_id,
                        "title": ut.title,
                        "text": ut.text,
                        "user_created": True,
                        "template_db_id": ut.id
                    })
        except Exception as e:
            # Log error and continue
            logger.error(f"Error fetching user templates: {e}")
    
    # Add default templates, replacing with user overrides when available
    for template in radiologyTemplates:
        if db and user_id and template["id"] in user_overrides:
            # Use user's override instead of default
            templates.append(user_overrides[template["id"]])
        else:
            # Use global default - create a copy to avoid modifying the original
            template_copy = template.copy()
            templates.append(template_copy)
    
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