from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base
from datetime import datetime

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    
    # Session metadata
    session_start = Column(DateTime, nullable=False)
    timer_start = Column(DateTime, nullable=True)
    first_generation = Column(DateTime, nullable=True)
    editing_start = Column(DateTime, nullable=True)
    timer_stop = Column(DateTime, nullable=True)
    session_end = Column(DateTime, nullable=True)
    
    # Duration metrics (in seconds)
    total_time_seconds = Column(Integer, nullable=True)
    input_time_seconds = Column(Integer, nullable=True)
    editing_time_seconds = Column(Integer, nullable=True)
    idle_time_seconds = Column(Integer, nullable=True)
    pause_count = Column(Integer, default=0)
    total_pause_seconds = Column(Integer, default=0)
    
    # Report metrics
    template_used = Column(String(255), nullable=True)
    input_words = Column(Integer, nullable=True)
    generated_words = Column(Integer, nullable=True)
    final_words = Column(Integer, nullable=True)
    saved_words = Column(Integer, nullable=True)
    edit_operations = Column(Integer, default=0)
    characters_added = Column(Integer, default=0)
    characters_deleted = Column(Integer, default=0)
    
    # Quality metrics
    completeness_score = Column(Float, nullable=True)
    modifications_ratio = Column(Float, nullable=True)
    
    # Study quality assessment
    uninterrupted_work = Column(Boolean, nullable=True)
    quality_self_assessment = Column(String(50), nullable=True)  # excellent, good, fair, poor
    interruption_notes = Column(Text, nullable=True)
    
    # Raw data storage
    session_data = Column(JSON, nullable=True)  # Complete session data as JSON
    
    # Relationships
    user = relationship("User", backref="study_sessions")
    report = relationship("Report", backref="study_session")