from fastapi import APIRouter, Depends, HTTPException
from ..data.templates import get_all_templates, get_template_by_id, update_default_template, delete_default_template
from ..core.database import get_db
from ..core.security import get_current_user_id, oauth2_scheme
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import jwt
from ..core.config import settings
from pydantic import BaseModel
from ..models.template_model import UserTemplate

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None

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

@router.put("/{template_id}")
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Update a template"""
    # Get the template
    template = db.query(UserTemplate).filter(
        UserTemplate.template_id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update the template
    if template_data.title is not None:
        template.title = template_data.title
    
    if template_data.text is not None:
        template.text = template_data.text
    
    try:
        db.commit()
        db.refresh(template)
        
        return {
            "id": template.template_id,
            "title": template.title,
            "text": template.text,
            "user_created": template.user_id != 1,
            "is_default_override": template.is_default_override,
            "template_db_id": template.id,
            "default_template_id": template.default_template_id if template.is_default_override else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")

@router.delete("/{template_id}")
async def remove_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a template - for default templates, delete user overrides to revert to default"""
    # First check if the template exists for this user
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Handle user-created custom templates (not overrides)
    if template.get("user_created", False) and not template.get("is_default_override", False):
        user_template = db.query(UserTemplate).filter(
            UserTemplate.id == template.get("template_db_id"),
            UserTemplate.user_id == current_user_id
        ).first()
        
        if not user_template:
            raise HTTPException(status_code=404, detail="User template not found")
        
        db.delete(user_template)
        db.commit()
        
        return {"detail": "Template successfully deleted"}
    
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
            
            return {"detail": "Template override deleted, reverted to default template"}
        else:
            raise HTTPException(status_code=404, detail="Template override not found")
    
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
            # Already hidden/deleted for this user
            return {"detail": "Template already hidden from your view"}
        
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
            
            return {"detail": "Template hidden from your view"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to hide template: {str(e)}")

@router.post("/{template_id}/override")
async def override_default_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a user-specific override for a default template"""
    # First check if the template exists
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if this is already a user template
    if template.get("user_created", False):
        # If it's already an override, return it
        if template.get("is_default_override", False) and template.get("default_template_id") == template_id:
            return template
        
        # Otherwise raise an error
        raise HTTPException(
            status_code=400, 
            detail="This is already a user template"
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
        raise HTTPException(status_code=500, detail=f"Failed to create template override: {str(e)}")