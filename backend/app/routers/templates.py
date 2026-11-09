"""
Templates Router - API-Endpoints für System- und Benutzer-Templates.

Dieses Modul enthält Endpoints für die Template-Verwaltung:

Template-Abruf:
- GET /templates/: Alle verfügbaren Templates (System + Benutzer)
- GET /templates/{template_id}: Einzelnes Template abrufen

Template-Bearbeitung:
- PUT /templates/{template_id}: Template aktualisieren
- DELETE /templates/{template_id}: Template löschen/ausblenden
- POST /templates/{template_id}/override: System-Template überschreiben

Das System unterscheidet zwischen:
1. System-Templates: Vordefinierte Standard-Templates (CT, MRT, etc.)
2. Benutzer-Templates: Vom Benutzer erstellte Templates
3. Overrides: Benutzeranpassungen von System-Templates
"""

from fastapi import APIRouter, Depends, HTTPException
from ..data.templates import get_all_templates, get_template_by_id, update_default_template, delete_default_template
from ..core.database import get_db
from ..core.security import get_current_user_id
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from ..models.template_model import UserTemplate
import logging

logger = logging.getLogger(__name__)

# System-Templates gehoeren dem Benutzer mit ID 1 (siehe data/templates.py)
SYSTEM_USER_ID = 1


class TemplateUpdate(BaseModel):
    """
    Pydantic-Model für Template-Aktualisierungen.

    Attributes:
        title (str, optional): Neuer Anzeigename des Templates
        text (str, optional): Neuer Template-Text
        apply_globally (bool): Nur bei System-Templates relevant. False (Standard):
            es wird eine persönliche Kopie (Override) für den Benutzer angelegt bzw.
            aktualisiert. True: das System-Template selbst wird für ALLE Benutzer
            geändert - das Frontend fragt dies explizit mit Warnung ab.
    """
    title: Optional[str] = None
    text: Optional[str] = None
    apply_globally: bool = False


router = APIRouter()

@router.get("/")
async def get_templates(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Ruft alle verfügbaren Templates des angemeldeten Benutzers ab.

    Gibt System-Templates sowie die eigenen Templates und Overrides des
    Benutzers zurück. Erfordert einen gültigen Login (401 sonst).

    Template-Priorisierung:
    1. Benutzer-Overrides ersetzen das ursprüngliche System-Template
    2. Benutzer-Templates werden zusätzlich angezeigt
    3. Gelöschte System-Templates werden für den Benutzer ausgeblendet

    Args:
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        List[dict]: Liste aller verfügbaren Templates
    """
    return get_all_templates(db=db, user_id=current_user_id)

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Ruft ein einzelnes Template nach ID ab.

    Berücksichtigt Benutzer-Overrides: Wenn der Benutzer ein Override für
    das angeforderte System-Template hat, wird das Override zurückgegeben.

    Args:
        template_id (str): ID des Templates (z.B. "ct-thorax-standard")
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        dict: Template-Daten

    Raises:
        HTTPException (404): Wenn das Template nicht existiert
    """
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    return template

@router.put("/{template_id}")
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Aktualisiert ein Template.

    Verhalten je nach Template-Typ:
    1. Eigenes Benutzer-Template oder eigenes Override: wird direkt geändert.
    2. System-Template (user_id=1), apply_globally=False (Standard): es wird eine
       persönliche Kopie (Override) angelegt bzw. ein vorhandenes Override
       aktualisiert. Das System-Template bleibt für alle anderen unverändert.
    3. System-Template, apply_globally=True: das System-Template selbst wird
       geändert und gilt damit für ALLE Benutzer. Ein evtl. vorhandenes eigenes
       Override bleibt bestehen und überdeckt die globale Vorlage weiterhin.
    4. Template eines anderen Benutzers: 404 (nicht sichtbar, nicht änderbar).

    Args:
        template_id (str): ID des zu aktualisierenden Templates
        template_data (TemplateUpdate): Neue Werte für Titel/Text, apply_globally
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        dict: Aktualisierte Template-Daten (bei Override: die Override-Daten)

    Raises:
        HTTPException (404): Wenn das Template nicht existiert oder fremd ist
        HTTPException (500): Bei Datenbankfehlern
    """
    template = db.query(UserTemplate).filter(
        UserTemplate.template_id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")

    is_system_template = template.user_id == SYSTEM_USER_ID
    is_own_template = template.user_id == current_user_id

    if not is_own_template and not is_system_template:
        # Vorlage eines anderen Benutzers - nach außen wie "nicht vorhanden"
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")

    try:
        if is_own_template or (is_system_template and template_data.apply_globally):
            # Fall 1 und 3: direkt ändern
            if is_system_template:
                logger.warning(
                    "GLOBALE Vorlagenänderung: Benutzer %s ändert System-Template '%s' für alle Benutzer",
                    current_user_id, template_id
                )
            if template_data.title is not None:
                template.title = template_data.title
            if template_data.text is not None:
                template.text = template_data.text
            target = template
        else:
            # Fall 2: persönliche Kopie anlegen/aktualisieren
            target = db.query(UserTemplate).filter(
                UserTemplate.user_id == current_user_id,
                UserTemplate.default_template_id == template_id,
                UserTemplate.is_default_override == True
            ).first()

            if target:
                # Vorhandenes Override (oder "[DELETED]"-Marker, der damit wieder sichtbar wird)
                is_deleted_marker = target.title == "[DELETED]" and target.text == "[DELETED]"
                # Nicht uebergebene Felder: beim echten Override dessen Werte behalten,
                # beim Marker auf das System-Template zurueckfallen
                fallback = template if is_deleted_marker else target
                target.template_id = f"user-{current_user_id}-override-{template_id}"
                target.title = template_data.title if template_data.title is not None else fallback.title
                target.text = template_data.text if template_data.text is not None else fallback.text
            else:
                target = UserTemplate(
                    user_id=current_user_id,
                    template_id=f"user-{current_user_id}-override-{template_id}",
                    title=template_data.title if template_data.title is not None else template.title,
                    text=template_data.text if template_data.text is not None else template.text,
                    is_default_override=True,
                    default_template_id=template_id
                )
                db.add(target)

        db.commit()
        db.refresh(target)

        return {
            "id": target.template_id,
            "title": target.title,
            "text": target.text,
            "user_created": target.user_id != SYSTEM_USER_ID,
            "is_default_override": target.is_default_override,
            "template_db_id": target.id,
            "default_template_id": target.default_template_id if target.is_default_override else None,
            "applied_globally": bool(is_system_template and template_data.apply_globally)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fehler beim Aktualisieren der Vorlage: {str(e)}")

@router.delete("/{template_id}")
async def remove_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Löscht ein Template oder setzt ein Override auf den Standard zurück.

    Das Verhalten hängt vom Template-Typ ab:
    1. Benutzer-Template (nicht Override): Wird dauerhaft gelöscht
    2. Benutzer-Override: Wird gelöscht, System-Template wird wieder sichtbar
    3. System-Template: Wird für den Benutzer ausgeblendet (nicht wirklich gelöscht)

    Args:
        template_id (str): ID des zu löschenden Templates
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        dict: Erfolgsmeldung

    Raises:
        HTTPException (404): Wenn das Template nicht existiert
        HTTPException (500): Bei Datenbankfehlern
    """
    # First check if the template exists for this user
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    # Handle user-created custom templates (not overrides)
    if template.get("user_created", False) and not template.get("is_default_override", False):
        user_template = db.query(UserTemplate).filter(
            UserTemplate.id == template.get("template_db_id"),
            UserTemplate.user_id == current_user_id
        ).first()
        
        if not user_template:
            raise HTTPException(status_code=404, detail="Benutzervorlage nicht gefunden")
        
        db.delete(user_template)
        db.commit()
        
        return {"detail": "Vorlage erfolgreich gelöscht"}
    
    # Handle default template overrides - delete the override to revert to default
    elif template.get("is_default_override", False):
        # This is a user override, delete it to revert to default
        user_override = db.query(UserTemplate).filter(
            UserTemplate.id == template.get("template_db_id"),
            UserTemplate.user_id == current_user_id,
            UserTemplate.is_default_override == True
        ).first()
        
        if user_override:
            db.delete(user_override)
            db.commit()
            
            return {"detail": "Vorlagenüberschreibung gelöscht, auf Standardvorlage zurückgesetzt"}
        else:
            raise HTTPException(status_code=404, detail="Vorlagenüberschreibung nicht gefunden")
    
    # Handle original default templates (no user overrides) - hide from user's view
    else:
        # This is an original default template, create a "deleted" marker
        # Check if a deleted override already exists
        existing_deleted_override = db.query(UserTemplate).filter(
            UserTemplate.user_id == current_user_id,
            UserTemplate.default_template_id == template_id,
            UserTemplate.is_default_override == True
        ).first()

        if existing_deleted_override:
            if existing_deleted_override.title == "[DELETED]" and existing_deleted_override.text == "[DELETED]":
                # Already hidden/deleted for this user
                return {"detail": "Vorlage ist bereits aus Ihrer Ansicht ausgeblendet"}
            # Ein echtes Override wurde ueber die System-ID angesprochen (so macht es das
            # Frontend beim "Zuruecksetzen"): Override loeschen -> Standard wieder sichtbar
            db.delete(existing_deleted_override)
            db.commit()
            return {"detail": "Vorlagenüberschreibung gelöscht, auf Standardvorlage zurückgesetzt"}
        
        # Create a "deleted" marker by creating an override with a special flag
        deleted_template_id = f"user-{current_user_id}-deleted-{template_id}"
        
        deleted_override = UserTemplate(
            user_id=current_user_id,
            template_id=deleted_template_id,
            title="[DELETED]",
            text="[DELETED]",
            is_default_override=True,
            default_template_id=template_id
        )
        
        try:
            db.add(deleted_override)
            db.commit()
            
            return {"detail": "Vorlage aus Ihrer Ansicht ausgeblendet"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Fehler beim Ausblenden der Vorlage: {str(e)}")

@router.post("/{template_id}/override")
async def override_default_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Erstellt eine benutzerspezifische Überschreibung eines System-Templates.

    Ermöglicht Benutzern, ein System-Template anzupassen, ohne das Original
    zu verändern. Das Override wird anstelle des System-Templates angezeigt.

    Beispiel:
    - Benutzer will "CT Thorax Standard" anpassen
    - Override wird erstellt mit ID "user-{user_id}-override-ct-thorax-standard"
    - Bei Template-Abruf wird das Override zurückgegeben

    Args:
        template_id (str): ID des zu überschreibenden System-Templates
        template_data (TemplateUpdate): Anpassungen (Titel/Text)
        db (Session): Datenbank-Session
        current_user_id (int): ID des authentifizierten Benutzers

    Returns:
        dict: Das erstellte Override-Template

    Raises:
        HTTPException (404): Wenn das System-Template nicht existiert
        HTTPException (400): Wenn es bereits ein Benutzer-Template ist
        HTTPException (500): Bei Datenbankfehlern
    """
    # First check if the template exists
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    # Check if this is already a user template
    if template.get("user_created", False):
        # If it's already an override, return it
        if template.get("is_default_override", False) and template.get("default_template_id") == template_id:
            return template
        
        # Otherwise raise an error
        raise HTTPException(
            status_code=400, 
            detail="Dies ist bereits eine Benutzervorlage"
        )
    
    # Check if an override already exists
    existing_override = db.query(UserTemplate).filter(
        UserTemplate.user_id == current_user_id,
        UserTemplate.default_template_id == template_id,
        UserTemplate.is_default_override == True
    ).first()
    
    if existing_override:
        # Return the existing override
        return {
            "id": existing_override.template_id,
            "title": existing_override.title,
            "text": existing_override.text,
            "user_created": True,
            "is_default_override": True,
            "template_db_id": existing_override.id,
            "original_default_id": existing_override.default_template_id
        }
    
    # Create the override
    new_template_id = f"user-{current_user_id}-override-{template_id}"
    
    # Use the provided data or the original template data
    new_override = UserTemplate(
        user_id=current_user_id,
        template_id=new_template_id,
        title=template_data.title or template["title"],
        text=template_data.text or template["text"],
        is_default_override=True,
        default_template_id=template_id
    )
    
    try:
        db.add(new_override)
        db.commit()
        db.refresh(new_override)
        
        return {
            "id": new_override.template_id,
            "title": new_override.title,
            "text": new_override.text,
            "user_created": True,
            "is_default_override": True,
            "template_db_id": new_override.id,
            "original_default_id": new_override.default_template_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen der Vorlagenüberschreibung: {str(e)}")