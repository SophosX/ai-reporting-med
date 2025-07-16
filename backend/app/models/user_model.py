from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, func
from sqlalchemy.orm import relationship
from ..core.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    custom_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Study-related fields
    study_participant = Column(Boolean, default=False, nullable=False)
    study_token = Column(String(255), nullable=True)
    experience_level = Column(String(50), nullable=True)  # assistenzarzt, facharzt, oberarzt
    full_name = Column(String(255), nullable=True)
    study_mode_active = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    templates = relationship("UserTemplate", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user")
