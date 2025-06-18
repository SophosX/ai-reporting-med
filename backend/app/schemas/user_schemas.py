from pydantic import BaseModel, EmailStr, validator
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    password_confirm: str
    
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

    class Config:
        orm_mode = True

class CustomPromptCreate(BaseModel):
    custom_prompt: str

class CustomPromptUpdate(BaseModel):
    custom_prompt: str

class CustomPromptOut(BaseModel):
    custom_prompt: Optional[str] = None

    class Config:
        orm_mode = True
