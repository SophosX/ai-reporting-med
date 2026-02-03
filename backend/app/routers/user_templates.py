"""
User Templates Router - API-Endpoints für benutzerdefinierte Templates.

Dieses Modul enthält CRUD-Operationen für Benutzer-Templates:
- POST /user-templates/: Neues Template erstellen
- GET /user-templates/: Alle eigenen Templates abrufen
- GET /user-templates/{id}/: Einzelnes Template abrufen
- PUT /user-templates/{id}/: Template aktualisieren
- DELETE /user-templates/{id}/: Template löschen

Besonderheiten:
- Unterstützt Import von Templates aus JSON-Dateien
- Generiert automatisch eindeutige Template-IDs
- Templates haben immer das Präfix "user-{user_id}-"
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from ..core.database import get_db
from ..models.template_model import UserTemplate
from ..schemas.template_schemas import UserTemplateCreate, UserTemplateOut, UserTemplateUpdate
from ..core.security import get_current_user_id
import re
import uuid
import time

router = APIRouter()


def slugify(text: str) -> str:
    """
    Konvertiert einen Titel in ein URL-sicheres Slug-Format.

    Wird verwendet, um aus dem Template-Titel eine eindeutige,
    URL-sichere Template-ID zu generieren.

    Transformationen:
    - Kleinschreibung
    - Entfernung von Sonderzeichen
    - Ersetzung von Leerzeichen durch Bindestriche
    - Entfernung führender/nachfolgender Bindestriche

    Args:
        text (str): Der zu konvertierende Titel

    Returns:
        str: URL-sicheres Slug

    Beispiel:
        slugify("CT Thorax Standard!") -> "ct-thorax-standard"
    """
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)  # Sonderzeichen entfernen
    text = re.sub(r'[\s_-]+', '-', text)  # Whitespace/Unterstriche zu Bindestrichen
    text = re.sub(r'^-+|-+$', '', text)  # Führende/nachfolgende Bindestriche entfernen
    return text


def generate_unique_template_id(user_id: int, title: str, is_import: bool = False) -> str:
    """
    Generiert eine eindeutige Template-ID für einen Benutzer.

    Bei manueller Erstellung wird ein deterministisches Format verwendet.
    Bei Importen wird ein UUID-Suffix hinzugefügt, um Duplikate zu vermeiden.

    Args:
        user_id (int): ID des Benutzers
        title (str): Titel des Templates
        is_import (bool): True wenn das Template importiert wird

    Returns:
        str: Eindeutige Template-ID

    Beispiele:
        - Manuell: "user-5-ct-thorax-custom"
        - Import: "user-5-ct-thorax-custom-a1b2c3d4"
    """
    base_slug = slugify(title)

    if is_import:
        # Bei Importen UUID-Suffix für Eindeutigkeit
        unique_suffix = str(uuid.uuid4())[:8]
        return f"user-{user_id}-{base_slug}-{unique_suffix}"
    else:
        # Bei manueller Erstellung: Standard-Format
        return f"user-{user_id}-{base_slug}"

@router.post("/", response_model=UserTemplateOut)
async def create_template(
    template_data: UserTemplateCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    from_import: bool = Query(False, description="Indicates if this template is being imported from JSON")
):
    """
    Erstellt ein neues benutzerdefiniertes Template.

    Unterstützt sowohl manuelle Erstellung als auch JSON-Import.
    Bei Importen werden bei Namenskonflikten automatisch neue IDs generiert.

    Template-ID-Generierung:
    - Wenn keine ID angegeben: Automatisch aus Titel generiert
    - Wenn ID angegeben aber ohne "user-" Präfix: Präfix wird hinzugefügt
    - Bei Import: UUID-Suffix bei Konflikten

    Args:
        template_data (UserTemplateCreate): Template-Daten (Titel, Text, etc.)
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers
        from_import (bool): True bei JSON-Import (aktiviert Konfliktlösung)

    Returns:
        UserTemplateOut: Das erstellte Template

    Raises:
        HTTPException (400): Bei doppelter Template-ID oder Erstellungsfehler
        HTTPException (500): Bei unerwarteten Fehlern
    """
    
    template_data_dict = template_data.dict()
    
    # Create template ID if not provided or ensure it starts with user- prefix
    if not template_data.template_id:
        template_id = generate_unique_template_id(current_user_id, template_data.title, from_import)
        template_data_dict["template_id"] = template_id
    else:
        # Ensure user templates always start with "user-" prefix
        if not template_data_dict["template_id"].startswith("user-"):
            template_data_dict["template_id"] = f"user-{current_user_id}-{template_data_dict['template_id']}"
    
    # For imports, if there's still a conflict, try to generate a new unique ID
    if from_import:
        max_attempts = 5
        attempt = 0
        original_id = template_data_dict["template_id"]
        
        while attempt < max_attempts:
            existing = db.query(UserTemplate).filter(UserTemplate.template_id == template_data_dict["template_id"]).first()
            if not existing:
                break
            
            # Generate a new unique ID with UUID
            attempt += 1
            unique_suffix = str(uuid.uuid4())[:8]
            base_name = original_id.split('-')
            if len(base_name) >= 3:
                # Remove any existing UUID suffix and add new one
                base_without_uuid = '-'.join(base_name[:-1]) if len(base_name[-1]) == 8 else original_id
                template_data_dict["template_id"] = f"{base_without_uuid}-{unique_suffix}"
            else:
                template_data_dict["template_id"] = f"{original_id}-{unique_suffix}"
        
        if attempt >= max_attempts:
            raise HTTPException(
                status_code=400, 
                detail="Eindeutige Vorlagen-ID konnte nach mehreren Versuchen nicht generiert werden. Bitte versuchen Sie es erneut."
            )
    else:
        # For manual creation, check if template_id already exists
        existing = db.query(UserTemplate).filter(UserTemplate.template_id == template_data_dict["template_id"]).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Vorlagen-ID existiert bereits. Bitte wählen Sie eine andere Vorlagen-ID oder einen anderen Titel."
            )
    
    try:
        new_template = UserTemplate(
            user_id=current_user_id,
            title=template_data_dict["title"],
            template_id=template_data_dict["template_id"],
            text=template_data_dict["text"],
            is_default_override=False
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        return new_template
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Fehler beim Erstellen der Vorlage. Vorlagen-ID existiert möglicherweise bereits.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unerwarteter Fehler: {str(e)}")

@router.get("/", response_model=List[UserTemplateOut])
async def get_user_templates(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Ruft alle benutzerdefinierten Templates des aktuellen Benutzers ab.

    Gibt nur Templates zurück, die vom Benutzer selbst erstellt wurden.
    System-Templates werden über den /templates/ Endpoint abgerufen.

    Args:
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        List[UserTemplateOut]: Liste aller Benutzer-Templates
    """
    templates = db.query(UserTemplate).filter(UserTemplate.user_id == current_user_id).all()
    return templates

@router.get("/{template_id}/", response_model=UserTemplateOut)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Ruft ein einzelnes Benutzer-Template nach Datenbank-ID ab.

    HINWEIS: Verwendet die numerische Datenbank-ID, nicht die template_id-String.

    Args:
        template_id (int): Datenbank-ID des Templates
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        UserTemplateOut: Das angeforderte Template

    Raises:
        HTTPException (404): Wenn Template nicht existiert oder anderem Benutzer gehört
    """
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden oder nicht autorisiert")
    
    return template

@router.put("/{template_id}/", response_model=UserTemplateOut)
async def update_template(
    template_id: int,
    template_data: UserTemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Aktualisiert ein bestehendes Benutzer-Template.

    Ermöglicht das Ändern von Titel und/oder Text. Nur angegebene
    Felder werden aktualisiert (Partial Update).

    Args:
        template_id (int): Datenbank-ID des Templates
        template_data (UserTemplateUpdate): Neue Werte (title und/oder text)
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        UserTemplateOut: Das aktualisierte Template

    Raises:
        HTTPException (404): Wenn Template nicht existiert oder anderem Benutzer gehört
    """
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden oder nicht autorisiert")
    
    if template_data.title is not None:
        template.title = template_data.title
    
    if template_data.text is not None:
        template.text = template_data.text
    
    db.commit()
    db.refresh(template)
    
    return template

@router.delete("/{template_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Löscht ein Benutzer-Template dauerhaft.

    WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!

    Args:
        template_id (int): Datenbank-ID des zu löschenden Templates
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        None (HTTP 204 No Content)

    Raises:
        HTTPException (404): Wenn Template nicht existiert oder anderem Benutzer gehört
    """
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden oder nicht autorisiert")
    
    db.delete(template)
    db.commit()
    
    return None 