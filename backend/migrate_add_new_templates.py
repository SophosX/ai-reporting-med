#!/usr/bin/env python3
"""
Migration script to add new templates to existing users.
This script will:
1. Add the new templates to the default templates (user_id=1)
2. Ensure all existing users can see these new templates
3. Only add templates that don't already exist

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

# New templates to add
NEW_TEMPLATES = [
    {
        "id": "CTBABDOMEN",
        "title": "Normalbefund Abdomen Lang",
        "text": """Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen. Regelrechte Kontrastierung der venösen und portalvenösen Gefäße. Arterieller Normalversorgungstyp. Keine intra- oder extrahepatische Cholestase. Unauffällige Gallenblase. Regelrechte Darstellung der Milz, des Pancreas sowie der Nebennieren.

Regelrechte Darstellung der Nieren, kein Harnstau. Harnblase unauffällig.///// Einzelne unkomplizierte Nierenzysten beidseits, sonst regelrechte Darstellung der Nieren, kein Harnstau.

Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm. Keine Passagestörung. Regelrechte Darstellung der Organe im kleinen Becken.
Keine freie intraabdominale Flüssigkeit. Keine freie Luft. Keine abdominelle Lymphadenopathie.

WENN NUR VENÖS: Soweit in der aktuellen Phase abgrenzbar regelrechte Kontrastierung der abgebildeten Gefäßabschnitte.

WENN ARTERIELL: Insgesamt regelrechte Kontrastierung der Aorta abdominalis sowie der viszeralen Gefäßabgänge. Kein Nachweis eines embolischen Gefäßverschlusses oder einer aktiven Blutung."""
    },
    {
        "id": "CTBABKURZ",
        "title": "Normalbefund Abdomen Kurz",
        "text": """Unauffällige Darstellung der parenchymatösen Oberbauchorgane. Keine Cholestase. Unauffällige Darstellung des Darms, keine Zeichen einer Passagestörung.
Keine freie intraabdominale Flüssigkeit, keine freie Luft. Keine abdominelle Lymphadenopathie."""
    },
    {
        "id": "CTBASBEST",
        "title": "Normalbefund Asbest",
        "text": """Es liegen mehrere Voruntersuchungen zum Vergleich vor, zuletzt vom

Atemartefakte.
Tracheobronchialsystem frei durchgängig. Regelrechte Belüftung beider Lungenflügel. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax. Keine malignomsuspekten intrapulmonalen Rundherde. Keine Pleuraplaques.

Normgroßes Herz ohne Dekompensationszeichen. Kein Perikarderguss.
Thorax symmetrisch, Mediastinum mittelständig und nicht verbreitert. Schilddrüse unauffällig.
Keine thorakale Lymphadenopathie.

Partiell miterfasste Oberbauchorgane in nativer Low-Dose-Technik unauffällig.
Gering degenerative Wirbelsäulenveränderungen, keine Fraktur."""
    },
    {
        "id": "CTBCCT",
        "title": "Normalbefund CCT",
        "text": """Regelrechte kortikomedulläre Differenzierung sowie Abgrenzbarkeit der Stammganglien. Mittelständiger Interhemisphärenspalt. Basale Zisternen abgrenzbar. Regelrechte Darstellung der inneren und äußeren Liquorräume.

Regelrechte Darstellung der abgebildeten pneumatisierten Räume. Knöcherne Strukturen unauffällig."""
    },
    {
        "id": "CTBHALS",
        "title": "Normalbefund Hals CT",
        "text": """Partiell eingeschränkte Beurteilbarkeit bei Aufhärtungsartefakten durch Zahnersatzmaterial.

Regelrechte, symmetrische Darstellung der Halsweichteile ohne Nachweis einer umschriebenen Raumforderung. Keine zervikale Lymphadenopathie.
Normal große Schilddrüse. Regelrechte Kontrastierung der Halsgefäße.
Freie Belüftung der partiell miterfassten Nasennebenhöhlen."""
    },
    {
        "id": "CTBLAE",
        "title": "Normalbefund LAE",
        "text": """Thorax:
Regelrechte Kontrastierung der Lungenarterien ohne Nachweis eines Embolus. Keine Rechtsherzbelastungszeichen. Ebenso regelrechte Kontrastierung der Aorta thorakalis und ihrer supraaortalen Gefäßabgänge ohne Nachweis eines Aneurysma oder einer Gefäßdissektion.
Normale Herzgröße ohne Dekompensationszeichen, kein Perikarderguss.
Regelrechte Belüftung beider Lungenflügel ohne Infiltrate. Keine Pleuraergüsse.
Kein Pneumothorax. Keine intrapulmonalen Rundherde. Keine thorakale Lymphadenopathie.

Unauffällige Darstellung der mitabgebildeten Oberbauchorgane.
Gering degenerative Wirbelsäulenveränderungen, keine Fraktur.

CT-Phlebographie:
Regelrechte Kontrastierung der Becken- und tiefen Oberschenkelvenen ohne Nachweis einer Thrombose. Unauffällige mitabgebildete Beckenorgane. Keine freie Flüssigkeit, keine freie Luft.

Sigmadivertikulose und Sigma elongatum. Degenerative Veränderungen der LWS."""
    },
    {
        "id": "CTBNNH",
        "title": "Normalbefund Nasennebenhöhlen CT",
        "text": """Nasennebenhöhlen regelrecht geformt, normal pneumatisiert und nicht verlegt. Knöcherne Begrenzung allseits glatt und scharf abgrenzbar. Keine Schleimhautschwellung, keine Flüssigkeitsspiegel, somit kein Anhalt für eine Sinusitis. Unauffällige Nasenhaupthöhle mit mittelständigem Septum. Keine röntgendichten Fremdkörper."""
    },
    {
        "id": "CTBSTEIN",
        "title": "Normalbefund Steinsuche",
        "text": """Kein Nachweis eines röntgendichten Konkrements in den ableitenden Harnwegen beidseits. Kein Harnstau. Soweit in Low-Dose-Technik beurteilbar unauffällige Darstellung beider Nieren sowie der übrigen miterfassten parenchymatösen Oberbauchorgane.
Regelrechte Darstellung des Darmes ohne Hinweis auf eine Passagestörung.
Keine freie abdominelle Flüssigkeit und Luft.
Unauffällige knöcherne Strukturen."""
    },
    {
        "id": "CTBT",
        "title": "Normalbefund Thorax",
        "text": """Beidseits regelrecht belüftete Lungenflügel, keine relevanten Belüftungsstörungen. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax.
Keine malignomsuspekten intrapulmonalen Rundherde.
Normgroßes Herz. Kein Perikarderguss.
Regelrechte Darstellung der großen intrathorakalen Gefäße.
Keine thorakale Lymphadenopathie.
Unauffällige Darstellung der miterfassten Oberbauchorgane."""
    },
    {
        "id": "CTBTAVI",
        "title": "CT TAVI Befund ohne Messung",
        "text": """Kalzium-Scoring:
Nachweis von geringen/moderaten/hochgradigen Koronarkarzifikationen mit einem Agatston-Score von xxx,xx (Volumen xxx,xx mm³). Vitientypische Aortenklappentaschenverkalkungen mit einem modifizierten Agatston-Score von xxx,xx (Volumen xxx,xx mm³).

Herz und Gefäße:
Biatrial betonte Kardiomegalie ohne Zeichen der kardialen Dekompensation. Kein Perikarderguss. Vitientypische Aortenklappentaschenkalzifikationen. Koronarsklerose. Moderate kalzifizierte Plaques des Aortenbogens sowie der supraaortalen Gefäßabgänge. Abgangsnahe kalzifizierte Plaques des Truncus coeliacus, der A. mesenterica superior und der Nierenarterien beidseits. Moderate bis ausgeprägte, kalzifizierende Vasosklerose der infrarenalen Aorta abdominalis. Moderate kalzifizierende Vasosklerose der A. iliaca communis beidseits sowie der A. iliaca interna beidseits und der A. femoralis communis beidseits. Elongation der Beckengefäße.

Thorax:
Frei durchgängiges Tracheobronchialsystem. Regelrechte Belüftung beider Lungenflügel. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax. Keine malignomsuspekten intrapulmonalen Rundherde.
Keine pathologisch vergrößerten Lymphknoten intrathorakal oder beidseits axillär.

Abdomen:
Soweit in der arteriellen Kontrastmittelphase beurteilbar weitgehend unauffällige Darstellung der parenchymatösen Oberbauchorgane. Keine freie Luft oder Flüssigkeit. Unauffällige Darstellung der Organe im kleinen Becken.

Skelett:
Gering ausgeprägte, degenerative Wirbelsäulenveränderungen. Keine frische Fraktur. Keine malignomsuspekten ossären Läsionen.

Beurteilung:
Vitientypische Aortenklappenverkalkungen. Freier, transfemoraler, arterieller Zugangsweg vor TAVI."""
    }
]

def add_new_templates(db: Session):
    """Add new templates to default templates"""
    logger.info("=== Adding new templates to default templates ===")
    
    added_count = 0
    
    for template_data in NEW_TEMPLATES:
        # Check if template already exists as a default template
        existing = db.query(UserTemplate).filter(
            UserTemplate.template_id == template_data["id"],
            UserTemplate.user_id == 1,  # Default templates have user_id=1
            UserTemplate.is_default_override == False
        ).first()
        
        if existing:
            logger.info(f"Template {template_data['id']} already exists - skipping")
        else:
            logger.info(f"Creating new default template: {template_data['id']}")
            new_template = UserTemplate(
                user_id=1,  # Use admin user ID
                template_id=template_data["id"],
                title=template_data["title"],
                text=template_data["text"],
                is_default_override=False
            )
            db.add(new_template)
            added_count += 1
    
    logger.info(f"Added {added_count} new templates")
    return added_count

def main():
    """Run the migration to add new templates"""
    logger.info("Starting template addition migration...")
    
    db = SessionLocal()
    try:
        # Ensure admin user exists
        admin_user = db.query(User).filter(User.id == 1).first()
        if not admin_user:
            logger.error("Admin user (id=1) not found. Please create the admin user first.")
            return
        
        # Add new templates
        added_count = add_new_templates(db)
        
        # Commit all changes
        db.commit()
        logger.info("✅ Template addition migration completed successfully!")
        
        # Print summary
        total_defaults = db.query(UserTemplate).filter(
            UserTemplate.user_id == 1,
            UserTemplate.is_default_override == False
        ).count()
        
        logger.info(f"📊 Migration Summary:")
        logger.info(f"   - New templates added: {added_count}")
        logger.info(f"   - Total default templates: {total_defaults}")
        
        # Note: Existing users will automatically see these new templates
        # because the get_all_templates function already includes all default templates
        # that don't have a user-specific override or deletion marker
        logger.info("\n📌 Note: All existing users will automatically see these new templates")
        logger.info("   when they next use the application.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()