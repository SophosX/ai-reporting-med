from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    input_text: str
    template_id: Optional[str] = None
    custom_prompt: Optional[str] = None
    format_instructions: Optional[str] = None

class ReportUpdate(BaseModel):
    report_text: str

class ReportOut(BaseModel):
    id: int
    input_text: str
    report_text: str
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True