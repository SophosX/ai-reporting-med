from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    input_text: str
    template_id: Optional[str] = None
    custom_prompt: Optional[str] = None

class ReportUpdate(BaseModel):
    report_text: str

class ReportOut(BaseModel):
    id: int
    input_text: str
    report_text: str
    created_at: datetime
    user_id: int
    template_id: Optional[str] = None
    template_text: Optional[str] = None
    
    # Word count metrics
    input_words: int = 0
    total_words: int = 0
    generated_words: int = 0
    saved_words: int = 0

    class Config:
        from_attributes = True