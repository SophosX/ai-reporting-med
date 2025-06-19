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

def slugify(text):
    """Convert a title to a safe template_id slug format."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

def generate_unique_template_id(user_id: int, title: str, is_import: bool = False):
    """Generate a unique template ID, with special handling for imports."""
    base_slug = slugify(title)
    
    if is_import:
        # For imports, use a UUID suffix to ensure uniqueness
        unique_suffix = str(uuid.uuid4())[:8]
        return f"user-{user_id}-{base_slug}-{unique_suffix}"
    else:
        # For manual creation, use the standard format
        return f"user-{user_id}-{base_slug}"

@router.post("/", response_model=UserTemplateOut)
async def create_template(
    template_data: UserTemplateCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    from_import: bool = Query(False, description="Indicates if this template is being imported from JSON")
):
    """Create a new user template."""
    
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
                detail="Unable to generate unique template ID after multiple attempts. Please try again."
            )
    else:
        # For manual creation, check if template_id already exists
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
            text=template_data_dict["text"],
            is_default_override=False
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