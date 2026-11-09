"""
Templates Data - Standard-Radiologie-Templates und Template-Verwaltungsfunktionen.

Dieses Modul enthält:
1. radiologyTemplates: Liste aller Standard-Befund-Templates für verschiedene
   radiologische Untersuchungen (CT, MRT, Röntgen, etc.)
2. Funktionen zur Template-Verwaltung in der Datenbank

Template-Struktur:
Jedes Template hat:
- id: Eindeutiger Identifier (z.B. "ct-thorax")
- title: Anzeigename (z.B. "CT Thorax")
- text: Strukturierter Befundtext mit Standardformulierungen

Beim Anwendungsstart werden diese Templates automatisch in die Datenbank
importiert (via import_default_templates). Die Funktion synchronisiert
auch Änderungen (neue Templates hinzufügen, alte entfernen).

Template-Hierarchie:
- System-Templates: user_id=1, is_default_override=False
- Benutzer-Overrides: user_id=<user>, is_default_override=True
- Benutzer-Templates: user_id=<user>, is_default_override=False
"""

from ..models.template_model import UserTemplate
from ..models.user_model import User  # Import für SQLAlchemy-Beziehungen
from sqlalchemy.orm import Session
import logging

# Logger für Template-Operationen
logger = logging.getLogger(__name__)

# Standard-Radiologie-Templates für verschiedene Untersuchungstypen
# Diese werden beim Anwendungsstart in die Datenbank importiert
radiologyTemplates = [
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
    },
    {
        "id": "CTBABDOMEN",
        "title": "Normalbefund Abdomen Lang",
        "text": """Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen. Regelrechte Kontrastierung der venösen und portalvenösen Gefäße. Arterieller Normalversorgungstyp. Keine intra- oder extrahepatische Cholestase. Unauffällige Gallenblase. Regelrechte Darstellung der Milz, des Pancreas sowie der Nebennieren.

Regelrechte Darstellung der Nieren, kein Harnstau. Harnblase unauffällig.

Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm. Keine Passagestörung. Regelrechte Darstellung der Organe im kleinen Becken.
Keine freie intraabdominale Flüssigkeit. Keine freie Luft. Keine abdominelle Lymphadenopathie.

Soweit in der aktuellen Phase abgrenzbar regelrechte Kontrastierung der abgebildeten Gefäßabschnitte."""
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
        "text": """Atemartefakte.
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
        "text": """Regelrechte, symmetrische Darstellung der Halsweichteile ohne Nachweis einer umschriebenen Raumforderung. Keine zervikale Lymphadenopathie.
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
    },
    {
        "id": "ct-hals-thorax-abdomen",
        "title": "CT Hals, Thorax, Abdomen",
        "text": """Hals:
Falls Metall angegeben: Partiell eingeschränkte Beurteilbarkeit bei Aufhärtungsartefakten durch Zahnersatzmaterial.


Regelrechte, symmetrische Darstellung der Halsweichteile ohne Nachweis einer umschriebenen Raumforderung. Keine zervikale Lymphadenopathie.
Normal große Schilddrüse. Regelrechte Kontrastierung der Halsgefäße.
Freie Belüftung der partiell miterfassten Nasennebenhöhlen.

Thorax:
Beidseits regelrecht belüftete Lungenflügel, keine relevanten Belüftungsstörungen. Keine pneumonischen Infiltrate. Kein Pleuraerguss. Kein Pneumothorax.
Keine malignomsuspekten intrapulmonalen Rundherde.
Normgroßes Herz. Kein Perikarderguss.
Regelrechte Darstellung der großen intrathorakalen Gefäße.
Keine thorakale Lymphadenopathie.

Abdomen:
Regelrechte Darstellung der Leber ohne Nachweis fokaler Parenchymläsionen. Regelrechte Kontrastierung der venösen und portalvenösen Gefäße. Arterieller Normalversorgungstyp. Keine intra- oder extrahepatische Cholestase. Unauffällige Gallenblase.
Regelrechte Darstellung der Milz, des Pancreas sowie der Nebennieren.
Regelrechte Darstellung der Nieren, kein Harnstau. Harnblase unauffällig.
Regelrechte Kontrastierung der Darmwände von Dünn- und Dickdarm. Keine Passagestörung.
Regelrechte Darstellung der Organe im kleinen Becken.
Keine freie intraabdominale Flüssigkeit. Keine freie Luft. Keine abdominelle Lymphadenopathie.
Soweit in der aktuellen Phase abgrenzbar regelrechte Kontrastierung der abgebildeten Gefäßabschnitte.

Skelett:
Altersentsprechend unauffällige Darstellung des Achsenskeletts. Keine malingomsuspekten ossären Läsionen. Keine Frakturen."""
    },
    {
        "id": "ct-felsenbein",
        "title": "CT Felsenbein",
        "text": """Regelrecht pneumatisierte Felsenbeine beidseits.Unauffällige Anlage und Darstellung der Schnecke sowie der Gehörknöchelchen beidseits. Normal pneumatisiertes Cavum tympani mit allseits glatten Konturen und unauffällig abgrenzbaren Gehörknöchelchen. Frei durchgängige, glatt begrenzte äußere Gehörgänge beidseits. 
Gute knöcherne Deckung der Bogengänge. Keine Bogengangdehiszenz. 
Kein Nachweis eines raumfordernden Prozesses. Regelhafte Pneumatisation der Mastoidzellen. Unauffällige mitabgebildete Nasennebenhöhlen. 
 """
    }
]


def get_template_by_id(template_id: str, db: Session = None, user_id: int = None):
    """
    Ruft ein Template nach ID aus der Datenbank ab.

    Prüft in folgender Reihenfolge:
    1. Benutzer-spezifisches Template (wenn user_id angegeben)
    2. System-Template (user_id=1)

    Args:
        template_id (str): Die eindeutige Template-ID (z.B. "ct-thorax")
        db (Session): SQLAlchemy-Datenbank-Session
        user_id (int, optional): ID des aktuellen Benutzers für Override-Prüfung

    Returns:
        dict: Template-Daten oder None wenn nicht gefunden
            - id: Template-ID
            - title: Anzeigename
            - text: Template-Text
            - user_created: True wenn Benutzer-Template
            - is_default_override: True wenn Override eines System-Templates
            - default_template_id: ID des überschriebenen Templates
            - template_db_id: Datenbank-ID
    """
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
    """
    Ruft alle verfügbaren Templates aus der Datenbank ab.

    Kombiniert System-Templates mit Benutzer-Templates und -Overrides.
    Gelöschte Templates (markiert mit "[DELETED]") werden ausgeblendet.

    Ablauf:
    1. System-Templates laden (user_id=1)
    2. Benutzer-Overrides laden (wenn user_id angegeben)
    3. Benutzer-eigene Templates laden
    4. Gelöschte Templates herausfiltern
    5. Overrides mit System-Templates zusammenführen

    Args:
        db (Session): SQLAlchemy-Datenbank-Session
        user_id (int, optional): ID des aktuellen Benutzers

    Returns:
        List[dict]: Liste aller verfügbaren Templates mit Metadaten
    """
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
    deleted_templates = set()
    if user_id:
        # Get overrides
        overrides = db.query(UserTemplate).filter(
            UserTemplate.user_id == user_id,
            UserTemplate.is_default_override == True
        ).all()
        
        # Create a mapping of default_template_id to override
        # Also track which templates have been deleted (marked with [DELETED])
        for override in overrides:
            if override.title == "[DELETED]" and override.text == "[DELETED]":
                # This is a deleted template marker - exclude it from results
                deleted_templates.add(override.default_template_id)
            else:
                # This is a regular override
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
    
    # Combine default templates with user overrides, excluding deleted templates
    for template in default_templates:
        # Skip templates that have been deleted by the user
        if template.template_id in deleted_templates:
            continue
            
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
    """
    Aktualisiert ein Standard-Template im In-Memory-Array.

    HINWEIS: Diese Funktion ändert nur das radiologyTemplates-Array,
    nicht die Datenbank. Für persistente Änderungen müssen die
    Templates in der DB aktualisiert werden.

    Args:
        template_id (str): ID des zu aktualisierenden Templates
        title (str, optional): Neuer Titel
        text (str, optional): Neuer Text

    Returns:
        dict: Das aktualisierte Template oder None wenn nicht gefunden
    """
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
    """
    Synchronisiert die Standard-Templates mit der Datenbank.

    Diese Funktion wird beim Anwendungsstart aufgerufen und:
    1. Importiert neue Templates aus radiologyTemplates
    2. Lässt existierende Templates UNVERÄNDERT (seit 2026-11: die Datenbank ist
       die Quelle der Wahrheit, damit globale Änderungen über die Oberfläche
       - PUT /templates/{id} mit apply_globally=true - einen Neustart überleben;
       radiologyTemplates dient nur noch als Erstbefüllung)
    3. Entfernt Templates, die nicht mehr im Array sind
    4. Entfernt auch zugehörige Benutzer-Overrides gelöschter Templates

    Die Funktion ist idempotent - mehrfache Aufrufe sind sicher.

    Args:
        db (Session): SQLAlchemy-Datenbank-Session

    Raises:
        Exception: Bei Datenbankfehlern (wird nach Rollback weitergereicht)
    """
    
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
            # Existing templates are left untouched so that global edits made in
            # the app (apply_globally=true) persist across restarts.
            logger.debug(f"Default template already present, keeping DB version: {template['id']}")
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
    """
    Aktualisiert die Formatierung ALLER Templates (System + Overrides).

    WARNUNG: Diese Funktion überschreibt auch Benutzer-Anpassungen!
    Sie sollte nur verwendet werden, wenn eine grundlegende Formatänderung
    für alle Templates erforderlich ist.

    Ablauf:
    1. System-Templates aktualisieren
    2. ALLE Benutzer-Overrides aktualisieren (Anpassungen gehen verloren)

    Args:
        db (Session): SQLAlchemy-Datenbank-Session

    Raises:
        Exception: Bei Datenbankfehlern (wird nach Rollback weitergereicht)
    """
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