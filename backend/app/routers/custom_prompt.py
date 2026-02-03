"""
Custom Prompt Router - API-Endpoints für die Verwaltung benutzerdefinierter KI-Prompts.

Dieses Modul enthält CRUD-Operationen für Custom Prompts:
- GET /custom-prompt/: Aktuellen Prompt abrufen
- POST /custom-prompt/: Neuen Prompt erstellen/setzen
- PUT /custom-prompt/: Prompt aktualisieren
- DELETE /custom-prompt/: Prompt löschen

Der Custom Prompt ist ein System-Prompt, der an die KI gesendet wird und
das Verhalten bei der Befundgenerierung beeinflusst.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user_id
from ..models.user_model import User
from ..schemas.user_schemas import CustomPromptCreate, CustomPromptUpdate, CustomPromptOut

router = APIRouter(tags=["custom-prompt"])


@router.get("/", response_model=CustomPromptOut)
async def get_custom_prompt(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Ruft den benutzerdefinierten KI-Prompt des aktuellen Benutzers ab.

    Args:
        current_user_id (int): ID des authentifizierten Benutzers
        db (Session): Datenbank-Session

    Returns:
        CustomPromptOut: Der aktuelle Custom Prompt (kann None sein)

    Raises:
        HTTPException (404): Wenn der Benutzer nicht existiert
    """
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    return CustomPromptOut(custom_prompt=user.custom_prompt)


@router.post("/", response_model=CustomPromptOut)
async def create_custom_prompt(
    prompt_data: CustomPromptCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Erstellt oder überschreibt den benutzerdefinierten KI-Prompt.

    Wenn bereits ein Prompt existiert, wird dieser überschrieben.
    Der Prompt wird als System-Anweisung an die KI gesendet.

    Args:
        prompt_data (CustomPromptCreate): Der neue Prompt-Text
        current_user_id (int): ID des authentifizierten Benutzers
        db (Session): Datenbank-Session

    Returns:
        CustomPromptOut: Der gespeicherte Custom Prompt

    Raises:
        HTTPException (404): Wenn der Benutzer nicht existiert
    """
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    user.custom_prompt = prompt_data.custom_prompt
    db.commit()
    db.refresh(user)

    return CustomPromptOut(custom_prompt=user.custom_prompt)


@router.put("/", response_model=CustomPromptOut)
async def update_custom_prompt(
    prompt_data: CustomPromptUpdate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Aktualisiert den benutzerdefinierten KI-Prompt.

    Funktionell identisch mit POST, aber semantisch korrekt für Updates.

    Args:
        prompt_data (CustomPromptUpdate): Der aktualisierte Prompt-Text
        current_user_id (int): ID des authentifizierten Benutzers
        db (Session): Datenbank-Session

    Returns:
        CustomPromptOut: Der aktualisierte Custom Prompt

    Raises:
        HTTPException (404): Wenn der Benutzer nicht existiert
    """
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    user.custom_prompt = prompt_data.custom_prompt
    db.commit()
    db.refresh(user)

    return CustomPromptOut(custom_prompt=user.custom_prompt)


@router.delete("/")
async def delete_custom_prompt(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Löscht den benutzerdefinierten KI-Prompt.

    Nach dem Löschen wird der System-Standard-Prompt verwendet.

    Args:
        current_user_id (int): ID des authentifizierten Benutzers
        db (Session): Datenbank-Session

    Returns:
        dict: Erfolgsmeldung

    Raises:
        HTTPException (404): Wenn der Benutzer nicht existiert
    """
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    user.custom_prompt = None
    db.commit()

    return {"message": "Benutzerdefinierter Prompt erfolgreich gelöscht"}
