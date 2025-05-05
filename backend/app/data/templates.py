from ..models.template_model import UserTemplate
from sqlalchemy.orm import Session

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
    # First check predefined templates
    for template in radiologyTemplates:
        if template["id"] == template_id:
            return template
    
    # Then check user templates if db and user_id are provided
    if db and user_id:
        if template_id.startswith("user-"):
            user_template = db.query(UserTemplate).filter(
                UserTemplate.template_id == template_id,
                UserTemplate.user_id == user_id
            ).first()
            
            if user_template:
                return {
                    "id": user_template.template_id,
                    "title": user_template.title,
                    "text": user_template.text
                }
    
    return None

def get_all_templates(db: Session = None, user_id: int = None):
    """Get all available templates, including user templates if specified"""
    templates = radiologyTemplates.copy()
    
    # Add user templates if db and user_id are provided
    if db and user_id:
        try:
            user_templates = db.query(UserTemplate).filter(UserTemplate.user_id == user_id).all()
            
            for ut in user_templates:
                templates.append({
                    "id": ut.template_id,
                    "title": ut.title,
                    "text": ut.text,
                    "user_created": True,
                    "template_db_id": ut.id
                })
        except Exception:
            # Silently fail if there's an error fetching user templates
            pass
    
    return templates