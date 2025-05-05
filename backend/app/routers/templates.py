from fastapi import APIRouter, Depends, HTTPException
from ..data.templates import get_all_templates, get_template_by_id
from ..core.database import get_db
from ..core.security import get_current_user_id, oauth2_scheme
from sqlalchemy.orm import Session
from typing import Optional
import jwt
from ..core.config import settings

router = APIRouter()

@router.get("/")
async def get_templates(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
):
    """Get all available templates, including user templates if authenticated"""
    user_id = None
    if token:
        try:
            # Decode the token manually to get the user ID
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = int(payload.get("sub"))
        except Exception:
            # Just skip user templates if auth fails
            pass
    
    templates = get_all_templates(db=db, user_id=user_id)
    return templates

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
):
    """Get a specific template by ID, including user templates if authenticated"""
    user_id = None
    if token:
        try:
            # Decode the token manually to get the user ID
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = int(payload.get("sub"))
        except Exception:
            # Just skip user templates if auth fails
            pass
    
    template = get_template_by_id(template_id, db=db, user_id=user_id)
    if not template:
        return {"detail": "Template not found"}
    return template