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
    """Get the current user's custom prompt"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return CustomPromptOut(custom_prompt=user.custom_prompt)

@router.post("/", response_model=CustomPromptOut)
async def create_custom_prompt(
    prompt_data: CustomPromptCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create or update the current user's custom prompt"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
    """Update the current user's custom prompt"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.custom_prompt = prompt_data.custom_prompt
    db.commit()
    db.refresh(user)
    
    return CustomPromptOut(custom_prompt=user.custom_prompt)

@router.delete("/")
async def delete_custom_prompt(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete the current user's custom prompt"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.custom_prompt = None
    db.commit()
    
    return {"message": "Custom prompt deleted successfully"} 