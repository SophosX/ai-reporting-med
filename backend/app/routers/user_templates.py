from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from ..core.database import get_db
from ..models.template_model import UserTemplate
from ..schemas.template_schemas import UserTemplateCreate, UserTemplateOut, UserTemplateUpdate
from ..core.security import get_current_user_id
import re

router = APIRouter()

def slugify(text):
    """Convert a title to a safe template_id slug format."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

@router.post("/", response_model=UserTemplateOut)
async def create_template(
    template_data: UserTemplateCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new user template."""
    
    # Create template ID if not provided
    if not template_data.template_id:
        template_data_dict = template_data.dict()
        template_id = f"user-{current_user_id}-{slugify(template_data.title)}"
        template_data_dict["template_id"] = template_id
    else:
        template_data_dict = template_data.dict()
    
    # Check if template_id already exists
    existing = db.query(UserTemplate).filter(UserTemplate.template_id == template_data_dict["template_id"]).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Template ID already exists. Please choose a different template ID or title."
        )
    
    try:
        new_template = UserTemplate(
            user_id=current_user_id,
            title=template_data_dict["title"],
            template_id=template_data_dict["template_id"],
            text=template_data_dict["text"]
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        return new_template
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error creating template. Template ID may already exist.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/", response_model=List[UserTemplateOut])
async def get_user_templates(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get all templates for the current user."""
    templates = db.query(UserTemplate).filter(UserTemplate.user_id == current_user_id).all()
    return templates

@router.get("/{template_id}/", response_model=UserTemplateOut)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get a specific template by ID."""
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not authorized")
    
    return template

@router.put("/{template_id}/", response_model=UserTemplateOut)
async def update_template(
    template_id: int,
    template_data: UserTemplateUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Update a template."""
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not authorized")
    
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
    """Delete a template."""
    template = db.query(UserTemplate).filter(
        UserTemplate.id == template_id,
        UserTemplate.user_id == current_user_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not authorized")
    
    db.delete(template)
    db.commit()
    
    return None 