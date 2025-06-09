from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from ..core.database import get_db
from ..models.report_model import Report
from ..schemas.report_schemas import ReportCreate, ReportOut, ReportUpdate
from ..services.openai_service import get_completion
from ..services.word_count_service import update_report_word_metrics, count_words
from ..core.security import get_current_user_id
from ..models.user_model import User
from ..data.templates import get_template_by_id
from ..services.pdf_service import generate_pdf
from datetime import datetime, timedelta
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
        custom_prompt=report_data.custom_prompt
    )

    # Create new report
    new_report = Report(
        user_id=current_user_id,
        input_text=report_data.input_text,
        report_text=generated_text,
        template_id=report_data.template_id,
        template_text=template_text
    )
    
    # Calculate and store word metrics
    # Pass the AI-generated text to properly track the original AI contribution
    update_report_word_metrics(new_report, ai_generated_text=generated_text)
    
    # Save to database
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
    
    # Update word count metrics following the new specification
    from ..services.word_count_service import calculate_word_metrics, count_words
    
    # Calculate new metrics based on the edited text
    input_words = getattr(report, 'input_words', 0) or count_words(report.input_text)
    ai_generated_words = report.generated_words  # Keep original AI contribution unchanged
    final_report_words = count_words(report.report_text)
    
    # Saved words = final report words - input words (words user didn't have to write)
    saved_words = max(0, final_report_words - input_words)
    
    # Update the report metrics
    report.input_words = input_words
    report.total_words = final_report_words
    report.saved_words = saved_words
    # report.generated_words stays the same (original AI contribution)
    
    # Save changes
    db.commit()
    db.refresh(report)
    
    return report


@router.get("/analytics/timeline", response_model=dict)
async def get_reports_timeline(
        period: Optional[str] = "weeks",
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    """
    Get timeline data for reports created over different time periods
    period options: 'days', 'weeks', 'months'
    """
    end_date = datetime.now()
    
    if period == "days":
        # Show last 30 days
        start_date = end_date - timedelta(days=29)
        query = (
            db.query(
                func.date(Report.created_at).label('date'),
                func.count(Report.id).label('count')
            )
            .filter(
                Report.user_id == current_user_id,
                func.date(Report.created_at) >= start_date.date(),
                func.date(Report.created_at) <= end_date.date()
            )
            .group_by(func.date(Report.created_at))
            .order_by(func.date(Report.created_at))
        )
        
        results = query.all()
        date_counts = {result.date: result.count for result in results}
        
        labels = []
        counts = []
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            labels.append(current_date.strftime("%b %d"))
            counts.append(date_counts.get(current_date, 0))
            current_date += timedelta(days=1)
            
        return {
            "labels": labels,
            "counts": counts,
            "period": "Last 30 days",
            "total_reports": sum(counts)
        }
    
    elif period == "weeks":
        # Show last 8 weeks
        start_date = end_date - timedelta(weeks=7)
        
        # Get all reports in the time range
        reports = db.query(Report).filter(
            Report.user_id == current_user_id,
            Report.created_at >= start_date,
            Report.created_at <= end_date
        ).all()
        
        # Group by week
        week_counts = {}
        for report in reports:
            # Calculate week start (Monday) for the report date
            report_date = report.created_at.date()
            days_since_monday = report_date.weekday()
            week_start = report_date - timedelta(days=days_since_monday)
            
            if week_start not in week_counts:
                week_counts[week_start] = 0
            week_counts[week_start] += 1
        
        # Generate labels and data for the last 8 weeks
        labels = []
        counts = []
        current_week_start = start_date.date()
        current_week_start = current_week_start - timedelta(days=current_week_start.weekday())
        
        for i in range(8):
            week_end = current_week_start + timedelta(days=6)
            labels.append(f"{current_week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}")
            counts.append(week_counts.get(current_week_start, 0))
            current_week_start += timedelta(weeks=1)
            
        return {
            "labels": labels,
            "counts": counts,
            "period": "Last 8 weeks",
            "total_reports": sum(counts)
        }
    
    elif period == "months":
        # Show last 6 months
        start_date = end_date.replace(day=1) - timedelta(days=150)  # Go back roughly 5 months
        
        query = (
            db.query(
                extract('year', Report.created_at).label('year'),
                extract('month', Report.created_at).label('month'),
                func.count(Report.id).label('count')
            )
            .filter(
                Report.user_id == current_user_id,
                Report.created_at >= start_date
            )
            .group_by(
                extract('year', Report.created_at),
                extract('month', Report.created_at)
            )
            .order_by(
                extract('year', Report.created_at),
                extract('month', Report.created_at)
            )
        )
        
        results = query.all()
        month_counts = {(int(result.year), int(result.month)): result.count for result in results}
        
        # Generate labels and data for the last 6 months
        labels = []
        counts = []
        current_date = end_date.replace(day=1)
        
        for i in range(6):
            month_date = current_date - timedelta(days=32 * i)
            month_date = month_date.replace(day=1)
            year = month_date.year
            month = month_date.month
            
            labels.insert(0, month_date.strftime("%b %Y"))
            counts.insert(0, month_counts.get((year, month), 0))
            
        return {
            "labels": labels,
            "counts": counts,
            "period": "Last 6 months",
            "total_reports": sum(counts)
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'days', 'weeks', or 'months'")


@router.get("/stats/word-counts", response_model=dict)
async def get_word_count_stats(
        db: Session = Depends(get_db),
        current_user_id: int = Depends(get_current_user_id)
):
    """Get aggregate word count statistics for all user reports"""
    
    # Get all reports for the user
    reports = db.query(Report).filter(Report.user_id == current_user_id).all()
    
    if not reports:
        return {
            "total_reports": 0,
            "total_words": 0,
            "total_generated_words": 0,
            "total_saved_words": 0,
            "average_words_per_report": 0,
            "average_saved_per_report": 0
        }
    
    # Calculate aggregates following the new specification
    from ..services.word_count_service import count_words, calculate_edit_delta
    
    total_input_words = 0
    total_words = 0
    total_generated_words = 0
    total_saved_words = 0
    total_edit_delta = 0
    total_saved_words_initial = 0
    
    for report in reports:
        # Ensure input_words is calculated if not stored
        input_words = getattr(report, 'input_words', 0) or count_words(report.input_text)
        
        total_input_words += input_words
        total_words += report.total_words
        total_generated_words += report.generated_words
        total_saved_words += report.saved_words
        
        # Calculate edit delta for this report
        edit_delta = calculate_edit_delta(report.generated_words, report.total_words)
        total_edit_delta += edit_delta
        
        # Calculate initial saved words (AI - Input)
        saved_initial = max(0, report.generated_words - input_words)
        total_saved_words_initial += saved_initial
    
    # Calculate averages
    report_count = len(reports)
    average_words_per_report = round(total_words / report_count) if report_count > 0 else 0
    average_saved_per_report = round(total_saved_words / report_count) if report_count > 0 else 0
    average_input_per_report = round(total_input_words / report_count) if report_count > 0 else 0
    average_edit_delta = round(total_edit_delta / report_count) if report_count > 0 else 0
    
    return {
        "total_reports": report_count,
        "total_input_words": total_input_words,
        "total_words": total_words,
        "total_generated_words": total_generated_words,
        "total_saved_words": total_saved_words,
        "total_saved_words_initial": total_saved_words_initial,  # AI - Input across all reports
        "total_edit_delta": total_edit_delta,  # Net words added/removed by users
        "average_words_per_report": average_words_per_report,
        "average_saved_per_report": average_saved_per_report,
        "average_input_per_report": average_input_per_report,
        "average_edit_delta": average_edit_delta
    }