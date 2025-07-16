from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from enum import Enum

class ExperienceLevel(str, Enum):
    ASSISTENZARZT = "assistenzarzt"
    FACHARZT = "facharzt"
    OBERARZT = "oberarzt"

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    password_confirm: str
    # Study fields - optional during registration
    full_name: Optional[str] = None
    study_token: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None
    
    @validator('password_confirm')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class UserLogin(BaseModel):
    identifier: str  # Kann entweder eine Email oder ein Username sein
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    custom_prompt: Optional[str] = None
    # Study fields
    study_participant: bool = False
    study_mode_active: bool = False
    experience_level: Optional[str] = None
    full_name: Optional[str] = None

    class Config:
        orm_mode = True

class StudyModeToggle(BaseModel):
    study_mode_active: bool

class CustomPromptCreate(BaseModel):
    custom_prompt: str

class CustomPromptUpdate(BaseModel):
    custom_prompt: str

class CustomPromptOut(BaseModel):
    custom_prompt: Optional[str] = None

    class Config:
        orm_mode = True
