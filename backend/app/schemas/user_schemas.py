from pydantic import BaseModel, EmailStr, validator

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

    class Config:
        orm_mode = True
