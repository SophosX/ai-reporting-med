from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..models.report_model import Report
from ..schemas.report_schemas import ReportCreate, ReportOut, ReportUpdate
from ..services.openai_service import get_completion
from ..core.security import get_current_user_id
from ..models.user_model import User
from ..data.templates import get_template_by_id
from ..services.pdf_service import generate_pdf
from datetime import datetime
import io

router = APIRouter()


@router.post("/", response_model=ReportOut)
async def create_report(
        report_data: ReportCreate,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    # Get template text if template_id is provided
    template_text = None
    if report_data.template_id:
        template = get_template_by_id(report_data.template_id, db=db, user_id=current_user_id)
        if template:
            template_text = template.get("text")

    # Generate the report text using OpenAI
    generated_text = get_completion(
        input_text=report_data.input_text,
        template_text=template_text,
        custom_prompt=report_data.custom_prompt,
        format_instructions=report_data.format_instructions
    )

    # Save to database
    new_report = Report(
        user_id=current_user_id,
        input_text=report_data.input_text,
        report_text=generated_text
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report


@router.get("/", response_model=List[ReportOut])
async def get_user_reports(
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    reports = db.query(Report).filter(Report.user_id == current_user_id).order_by(Report.created_at.desc()).all()
    return reports


@router.get("/stats/count", response_model=dict)
async def get_reports_count(
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    count = db.query(Report).filter(Report.user_id == current_user_id).count()
    return {"total": count}


@router.get("/recent", response_model=List[ReportOut])
async def get_recent_reports(
        limit: Optional[int] = 3,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    reports = db.query(Report).filter(Report.user_id == current_user_id).order_by(Report.created_at.desc()).limit(limit).all()
    return reports


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
        report_id: int,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
        report_id: int,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")

    db.delete(report)
    db.commit()
    return None


@router.get("/{report_id}/pdf", response_class=Response)
async def get_report_pdf(
        report_id: int,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    # Get the report
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")
    
    # Get user information for the report
    user = db.query(User).filter(User.id == current_user_id).first()
    
    # Generate PDF
    report_date = report.created_at.strftime("%d %b %Y") if report.created_at else datetime.now().strftime("%d %b %Y")
    
    report_data = {
        "id": report.id,
        "date": report_date,
        "input": report.input_text,
        "report_text": report.report_text,
        "user_name": user.username if user else "Anonymous"
    }
    
    pdf_bytes = generate_pdf(report_data)
    
    # Return PDF as a downloadable file
    headers = {
        'Content-Disposition': f'attachment; filename="medical_report_{report.id}.pdf"'
    }
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )


@router.put("/{report_id}", response_model=ReportOut)
async def update_report(
        report_id: int,
        report_data: ReportUpdate,
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    # Get the existing report
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")

    # Update the report text
    report.report_text = report_data.report_text
    
    # Save changes
    db.commit()
    db.refresh(report)
    
    return report