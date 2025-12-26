from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text, nullable=False)
    report_text = Column(Text, nullable=False)
    template_id = Column(String(50), nullable=True)
    template_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Word count metrics
    input_words = Column(Integer, default=0)  # Words in the radiologist's initial input
    total_words = Column(Integer, default=0)  # Final report word count
    generated_words = Column(Integer, default=0)  # AI-generated word count
    saved_words = Column(Integer, default=0)  # Words saved (final - input)

    # Study comparison field (added 2025-12-09)
    is_manual = Column(Boolean, default=False)  # True for manually written reports, False for AI-generated

    # Study session tracking (added 2025-12-26)
    case_id = Column(String(100), nullable=True)  # Case ID for matching AI vs manual reports
    study_duration_seconds = Column(Integer, nullable=True)  # Total study session duration in seconds

    user = relationship("User", back_populates="reports")
