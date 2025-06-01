from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    input_text: str
    template_id: Optional[str] = None
    template_text: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: int
    report_text: str
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True 