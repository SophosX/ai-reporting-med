from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.user_model import User
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user_schemas import UserCreate, UserLogin, UserOut
from datetime import timedelta
from ..core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=400, 
            detail="Username already exists. Please choose a different username."
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=400, 
            detail="Email address is already registered. Please use a different email."
        )

    # Validate study token if provided
    study_participant = False
    if user_data.study_token:
        # Valid tokens for the study (in production, these would be in a database)
        VALID_STUDY_TOKENS = ["RADEFF2024", "STUDYMED2024", "AIRAD2024"]
        
        if user_data.study_token not in VALID_STUDY_TOKENS:
            raise HTTPException(
                status_code=400,
                detail="Invalid study token. Please check your invitation email for the correct token."
            )
        
        # If study token is valid, require full name and experience level
        if not user_data.full_name or not user_data.experience_level:
            raise HTTPException(
                status_code=400,
                detail="Full name and experience level are required for study participants."
            )
        
        study_participant = True

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_pw,
        full_name=user_data.full_name,
        study_participant=study_participant,
        study_token=user_data.study_token if study_participant else None,
        experience_level=user_data.experience_level.value if user_data.experience_level else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Return only user information without token
    return new_user

@router.post("/login")
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    print("user")
    identifier = login_data.identifier
    # Entscheide anhand eines einfachen Heuristik: Enthält der Identifier ein "@"? Dann als Email behandeln.
    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.username == identifier).first()
    
    print("user",user)

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "study_participant": user.study_participant,
        "experience_level": user.experience_level,
        "study_mode_active": user.study_mode_active
    }
