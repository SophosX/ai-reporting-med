from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserTemplateBase(BaseModel):
    title: str
    template_id: Optional[str] = None
    text: str
    is_default_override: bool = False
    default_template_id: Optional[str] = None

class UserTemplateCreate(UserTemplateBase):
    pass

class UserTemplateUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None

class DefaultTemplateOverride(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None

class UserTemplateOut(UserTemplateBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True 