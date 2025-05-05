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
    """Update a template - creates a user override for default templates"""
    # First check if the template exists
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # If it's a user template, handle it directly
    if template.get("user_created", False):
        # If it's a user template but not an override of this template, raise error
        if template.get("is_default_override", False) and template.get("default_template_id") != template_id:
            raise HTTPException(
                status_code=400, 
                detail="This is an override of a different template"
            )
        
        # Update the user template
        user_template = db.query(UserTemplate).filter(
            UserTemplate.id == template.get("template_db_id")
        ).first()
        
        if not user_template:
            raise HTTPException(status_code=404, detail="User template not found")
        
        if template_data.title is not None:
            user_template.title = template_data.title
        
        if template_data.text is not None:
            user_template.text = template_data.text
        
        db.commit()
        db.refresh(user_template)
        
        return {
            "id": user_template.template_id,
            "title": user_template.title,
            "text": user_template.text,
            "user_created": True,
            "is_default_override": user_template.is_default_override,
            "template_db_id": user_template.id,
            "original_default_id": user_template.default_template_id if user_template.is_default_override else None
        }
    
    # If it's a default template, create an override
    # This is a redirect to the override endpoint
    override_response = await override_default_template(
        template_id=template_id,
        template_data=template_data,
        db=db,
        current_user_id=current_user_id
    )
    
    # Then update it if needed
    if (template_data.title and override_response["title"] != template_data.title) or \
       (template_data.text and override_response["text"] != template_data.text):
        user_template = db.query(UserTemplate).filter(
            UserTemplate.id == override_response["template_db_id"]
        ).first()
        
        if template_data.title is not None:
            user_template.title = template_data.title
        
        if template_data.text is not None:
            user_template.text = template_data.text
        
        db.commit()
        db.refresh(user_template)
        
        return {
            "id": user_template.template_id,
            "title": user_template.title,
            "text": user_template.text,
            "user_created": True,
            "is_default_override": True,
            "template_db_id": user_template.id,
            "original_default_id": user_template.default_template_id
        }
    
    return override_response

@router.delete("/{template_id}")
async def remove_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a template - for default templates, never delete the default template itself or any overrides"""
    # First check if the template exists
    template = get_template_by_id(template_id, db=db, user_id=current_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Only allow deletion of user-created templates (not overrides)
    if template.get("user_created", False) and not template.get("is_default_override", False):
        user_template = db.query(UserTemplate).filter(
            UserTemplate.id == template.get("template_db_id")
        ).first()
        
        if not user_template:
            raise HTTPException(status_code=404, detail="User template not found")
        
        db.delete(user_template)
        db.commit()
        
        return {"detail": "Template successfully deleted"}
        
    # If we reach here, it's a template we cannot delete
    # (either a default template or an override)
    return {"detail": "Standard templates and their overrides cannot be deleted"}

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