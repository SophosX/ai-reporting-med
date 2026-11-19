"""
Study Router - API-Endpoints für wissenschaftliche Studien-Sessions.

Dieses Modul enthält alle Endpoints für die wissenschaftliche Studie:

Studienmodus:
- POST /study/study-mode/toggle: Studienmodus aktivieren/deaktivieren
- GET /study/study-mode/status: Aktuellen Studienmodus-Status abrufen

Session-Management:
- POST /study/study-session/start: Neue Studien-Session starten
- POST /study/study-session/{id}/timer-start: Timer starten
- POST /study/study-session/{id}/complete: Session mit Metriken abschließen

- POST /study/study-session/{id}/cancel: Abbruch einer Session markieren
- POST /study/events: Ereignisse aus dem Browser (nur Zählwerte, keine Texte)

Datenexport:
- GET /study/study-data/export: Eigene Studiendaten exportieren
- GET /study/study-data/export-all: Alle Studiendaten exportieren (Admin)
- GET /study/study-data/export-all.csv: Eine Zeile pro Session für die Statistik (Admin)

Die Studie vergleicht KI-gestützte Befunderstellung ("with_ai") mit
manueller Befunderstellung ("without_ai") anhand verschiedener Metriken.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Union
from datetime import datetime, timezone
import json
from jose import jwt, JWTError
from pydantic import BaseModel
from ..core.database import get_db
from ..models import User, StudySession
from ..schemas.user_schemas import StudyModeToggle
from ..core.config import settings
from ..models.study_tracking import ReportVersion, StudyEvent
from ..services.study_tracking_service import platform_version, log_server_event
import csv
import io

router = APIRouter()


async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Authentifiziert einen Benutzer anhand des Authorization-Headers.

    Diese Hilfsfunktion extrahiert und validiert den JWT-Token aus dem
    Bearer-Authorization-Header und gibt das entsprechende User-Objekt zurück.

    Args:
        authorization (str): Authorization-Header ("Bearer <token>")
        db (Session): Datenbank-Session

    Returns:
        User: Das authentifizierte User-Objekt

    Raises:
        HTTPException (401): Bei fehlendem oder ungültigem Token
        HTTPException (404): Wenn der Benutzer nicht existiert
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise HTTPException(status_code=401, detail="Ungültiges Token")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    return user

@router.post("/study-mode/toggle")
async def toggle_study_mode(
    toggle_data: StudyModeToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Aktiviert oder deaktiviert den Studienmodus für einen Benutzer.

    Im Studienmodus werden zusätzliche Metriken erfasst und der Benutzer
    kann Studien-Sessions starten. Nur Studienteilnehmer können den
    Studienmodus verwenden.

    Args:
        toggle_data (StudyModeToggle): {"study_mode_active": true/false}
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Neuer Status und Bestätigungsmeldung

    Raises:
        HTTPException (403): Wenn der Benutzer kein Studienteilnehmer ist
    """
    if not current_user.study_participant:
        raise HTTPException(
            status_code=403,
            detail="Nur Studienteilnehmer können den Studienmodus umschalten"
        )
    
    current_user.study_mode_active = toggle_data.study_mode_active
    db.commit()
    
    return {
        "study_mode_active": current_user.study_mode_active,
        "message": f"Study mode {'activated' if current_user.study_mode_active else 'deactivated'}"
    }

@router.get("/study-mode/status")
async def get_study_mode_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gibt den aktuellen Studienmodus-Status des Benutzers zurück.

    Returns:
        dict: Status-Informationen
            - study_participant: Ist der Benutzer Studienteilnehmer?
            - study_mode_active: Ist der Studienmodus aktiviert?
            - experience_level: Erfahrungsstufe des Arztes
            - full_name: Vollständiger Name
    """
    return {
        "study_participant": current_user.study_participant,
        "study_mode_active": current_user.study_mode_active,
        "experience_level": current_user.experience_level,
        "full_name": current_user.full_name
    }

class StudySessionStart(BaseModel):
    """
    Pydantic-Model für den Start einer Studien-Session.

    Attributes:
        template_id: ID des verwendeten Templates (optional)
        case_id: Vom Arzt vergebene Fall-ID für Paarung von KI/Manual-Sessions
        session_type: Art der Session ('with_ai' oder 'without_ai')
    """
    template_id: Optional[Union[int, str]] = None
    case_id: Optional[str] = None
    session_type: Optional[str] = "with_ai"  # 'with_ai' oder 'without_ai'

@router.post("/study-session/start")
async def start_study_session(
    data: StudySessionStart = StudySessionStart(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Startet eine neue Studien-Session für die Befunderstellung.

    Eine Session erfasst alle Metriken während der Befunderstellung:
    - Zeitstempel (Start, Timer-Start, Ende)
    - Session-Typ (mit oder ohne KI)
    - Fall-ID für Paarung von Vergleichsbefunden

    Args:
        data (StudySessionStart): Session-Konfiguration
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Session-ID und Startzeit

    Raises:
        HTTPException (403): Wenn der Studienmodus nicht aktiv ist
    """
    if not current_user.study_mode_active:
        raise HTTPException(
            status_code=403,
            detail="Der Studienmodus muss aktiv sein, um eine Studiensitzung zu starten."
        )

    # Convert template_id to int if it's a string
    template_id_int = None
    if data.template_id:
        try:
            template_id_int = int(data.template_id) if isinstance(data.template_id, str) else data.template_id
        except (ValueError, TypeError):
            # If it's not a valid number, just leave it as None
            template_id_int = None

    # Create new study session
    study_session = StudySession(
        user_id=current_user.id,
        report_id=None,  # Will be set later when report is created
        session_start=datetime.utcnow(),
        case_id=data.case_id,
        session_type=data.session_type or "with_ai",
        status="started",
        platform_version=platform_version(),
    )

    db.add(study_session)
    db.commit()
    db.refresh(study_session)

    return {
        "session_id": study_session.id,
        "session_start": study_session.session_start,
        "case_id": study_session.case_id,
        "session_type": study_session.session_type
    }

@router.post("/study-session/{session_id}/timer-start")
async def start_timer(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Startet den Timer für aktive Arbeit in einer Studien-Session.

    Der Timer wird gestartet, wenn der Benutzer mit der eigentlichen
    Befunderstellung beginnt (nach Auswahl des Templates, etc.).

    Args:
        session_id (int): ID der Studien-Session
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Zeitstempel des Timer-Starts

    Raises:
        HTTPException (404): Wenn die Session nicht existiert
    """
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Studiensitzung nicht gefunden")
    
    session.timer_start = datetime.utcnow()
    db.commit()
    
    return {"timer_start": session.timer_start}

@router.post("/study-session/{session_id}/complete")
async def complete_study_session(
    session_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Schließt eine Studien-Session mit allen gesammelten Metriken ab.

    Diese Funktion speichert alle während der Befunderstellung erfassten
    Daten und verknüpft die Session mit dem erstellten Befund.

    Gespeicherte Metriken:
    - report_id: ID des erstellten Befunds
    - case_id: Fall-ID für Paarung
    - template_used: Verwendetes Template
    - Wortanzahlen: input, generated, final, saved
    - Bearbeitungsmetriken: edit_operations, characters_added/deleted
    - Pausenmetriken: pause_count, total_pause_seconds
    - manual_report_text: Bei manuellen Sessions der Befundtext

    Args:
        session_id (int): ID der abzuschließenden Session
        data (dict): Gesammelte Metriken vom Frontend
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Erfolgsmeldung

    Raises:
        HTTPException (404): Wenn die Session nicht existiert
    """
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Studiensitzung nicht gefunden")

    # Doppelter Abschluss darf die gemessenen Zeiten nicht überschreiben
    if session.session_end is not None:
        log_server_event(db, current_user.id, "duplicate_complete", session_id=session.id)
        db.commit()
        return {"message": "Study session already completed"}

    # Update report_id if provided
    if data.get("report_id"):
        session.report_id = data.get("report_id")

    # Update manual_report_text for manual sessions
    if data.get("manual_report_text"):
        session.manual_report_text = data.get("manual_report_text")

    # Update case_id if provided
    if data.get("case_id"):
        session.case_id = data.get("case_id")

    # Update session with completion data
    session.timer_stop = datetime.utcnow()
    session.session_end = datetime.utcnow()

    # Calculate durations
    if session.session_start and session.session_end:
        session.total_time_seconds = int(
            (session.session_end - session.session_start).total_seconds()
        )

    # Update metrics from frontend
    session.template_used = data.get("template_used")
    session.input_words = data.get("input_words")
    session.generated_words = data.get("generated_words")
    session.final_words = data.get("final_words")
    session.saved_words = data.get("saved_words")
    session.edit_operations = data.get("edit_operations", 0)
    session.characters_added = data.get("characters_added", 0)
    session.characters_deleted = data.get("characters_deleted", 0)
    session.pause_count = data.get("pause_count", 0)
    session.total_pause_seconds = data.get("total_pause_seconds", 0)

    # Quality assessment removed - not needed anymore

    # Netto-Arbeitszeit ohne Pausen
    if session.total_time_seconds is not None:
        session.active_time_seconds = max(0, session.total_time_seconds - (session.total_pause_seconds or 0))
    session.status = "completed"
    session.platform_version = session.platform_version or platform_version()
    client_metrics = data.get("client_metrics")
    if isinstance(client_metrics, dict):
        session.client_metrics = _sanitize_payload(client_metrics)

    # Store complete session data as JSON
    session.session_data = data

    # Update the associated report with case_id and duration if report exists
    if session.report_id:
        from ..models.report_model import Report
        report = db.query(Report).filter(Report.id == session.report_id).first()
        if report:
            # Update report with case_id if not already set
            if session.case_id and not report.case_id:
                report.case_id = session.case_id

            # Update report with study duration
            if session.total_time_seconds is not None:
                report.study_duration_seconds = session.total_time_seconds

            if report.study_session_id is None:
                report.study_session_id = session.id

    db.commit()

    return {"message": "Study session completed successfully"}

@router.post("/study-session/{session_id}/cancel")
async def cancel_study_session(
    session_id: int,
    data: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Markiert eine Studien-Session als abgebrochen (Teilnehmer hat "Abbrechen" geklickt).

    Abgebrochene Sessions bleiben gespeichert, damit Abbrüche in der Auswertung
    sichtbar sind und nicht mit liegengelassenen Sessions verwechselt werden.
    """
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Studiensitzung nicht gefunden")
    if session.session_end is None:
        session.status = "cancelled"
        client_metrics = (data or {}).get("client_metrics")
        if isinstance(client_metrics, dict):
            session.client_metrics = _sanitize_payload(client_metrics)
    log_server_event(db, current_user.id, "session_cancelled", session_id=session.id)
    db.commit()
    return {"message": "Study session cancelled"}


_MAX_EVENTS_PER_BATCH = 200
_MAX_STR_LEN = 100


def _sanitize_payload(payload: dict, depth: int = 0) -> dict:
    """
    Lässt nur Zahlen, Wahrheitswerte und kurze Zeichenketten zu (keine Textinhalte).
    Verschachtelung bis Tiefe 2, maximal 60 Schlüssel.
    """
    clean = {}
    for i, (key, value) in enumerate(payload.items()):
        if i >= 60:
            break
        key = str(key)[:50]
        if isinstance(value, bool) or value is None or isinstance(value, (int, float)):
            clean[key] = value
        elif isinstance(value, str):
            clean[key] = value[:_MAX_STR_LEN]
        elif isinstance(value, dict) and depth < 2:
            clean[key] = _sanitize_payload(value, depth + 1)
    return clean


def _parse_client_ts(value) -> Optional[datetime]:
    """ISO-Zeitstempel aus dem Browser (UTC) -> naive UTC-datetime."""
    if not value or not isinstance(value, str):
        return None
    try:
        ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if ts.tzinfo is not None:
            ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
        return ts
    except ValueError:
        return None


class StudyEventIn(BaseModel):
    type: str
    ts: Optional[str] = None
    session_id: Optional[int] = None
    report_id: Optional[int] = None
    payload: Optional[dict] = None


class StudyEventBatch(BaseModel):
    events: List[StudyEventIn]


@router.post("/events")
async def record_study_events(
    batch: StudyEventBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Nimmt Ereignisse aus dem Browser entgegen (Seite geöffnet, Generieren geklickt,
    Pause, Tab verlassen, Kopieren ...). Nur für Studienteilnehmer; Sessions und
    Befunde müssen dem Benutzer gehören. Payloads werden auf Zählwerte reduziert.
    """
    if not current_user.study_participant:
        return {"accepted": 0}

    from ..models.report_model import Report

    events = batch.events[:_MAX_EVENTS_PER_BATCH]
    session_ids = {e.session_id for e in events if e.session_id}
    report_ids = {e.report_id for e in events if e.report_id}
    owned_sessions = set()
    report_session = {}  # eigene Befund-ID -> verknüpfte Session (oder None)
    if session_ids:
        owned_sessions = {
            sid for (sid,) in db.query(StudySession.id).filter(
                StudySession.id.in_(session_ids), StudySession.user_id == current_user.id
            ).all()
        }
    if report_ids:
        report_session = {
            rid: rsid for (rid, rsid) in db.query(Report.id, Report.study_session_id).filter(
                Report.id.in_(report_ids), Report.user_id == current_user.id
            ).all()
        }

    now = datetime.utcnow()
    accepted = 0
    for e in events:
        event_type = (e.type or "")[:50]
        if not event_type:
            continue
        db.add(StudyEvent(
            user_id=current_user.id,
            # Ereignisse von der Detailseite kennen nur den Befund -> Session über den Befund
            study_session_id=(e.session_id if e.session_id in owned_sessions
                              else report_session.get(e.report_id)),
            report_id=e.report_id if e.report_id in report_session else None,
            event_type=event_type,
            client_ts=_parse_client_ts(e.ts),
            server_ts=now,
            payload=_sanitize_payload(e.payload) if isinstance(e.payload, dict) else None,
        ))
        accepted += 1
    db.commit()
    return {"accepted": accepted}


@router.get("/study-data/export")
async def export_user_study_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exportiert die Studiendaten des aktuellen Benutzers.

    Der Export enthält alle Sessions des Benutzers mit vollständigen
    Metriken für die wissenschaftliche Auswertung.

    Export-Struktur:
    - study_id: Studien-Identifier
    - export_date: Zeitstempel des Exports
    - participant: Benutzerinformationen
    - total_sessions: Anzahl der Sessions
    - sessions: Array mit allen Session-Details

    Args:
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Vollständige Studiendaten als JSON

    Raises:
        HTTPException (403): Wenn der Benutzer kein Studienteilnehmer ist
    """
    if not current_user.study_participant:
        raise HTTPException(
            status_code=403,
            detail="Nur Studienteilnehmer können ihre Daten exportieren"
        )
    
    # Import Report model here to avoid circular imports
    from ..models.report_model import Report
    
    # Get only sessions for the current user
    sessions = db.query(StudySession).filter(
        StudySession.user_id == current_user.id
    ).all()
    
    study_data = {
        "study_id": "rad_efficiency_2024",
        "study_version": "1.0",
        "export_date": datetime.utcnow().isoformat(),
        "participant": {
            "user_id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "experience_level": current_user.experience_level
        },
        "total_sessions": len(sessions),
        "sessions": []
    }
    
    for session in sessions:
        session_data = _build_session_data(session, db)
        study_data["sessions"].append(session_data)
    
    return study_data

@router.get("/study-data/export-all")
async def export_all_study_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exportiert alle Studiendaten aller Teilnehmer (nur für Administratoren).

    Dieser Endpoint ermöglicht den vollständigen Export aller Studiendaten
    für die wissenschaftliche Auswertung. Nur der Admin-Benutzer hat Zugriff.

    Export-Struktur:
    - study_id: Studien-Identifier
    - export_type: "admin_full_export"
    - total_participants: Anzahl aller Studienteilnehmer
    - total_sessions: Anzahl aller Sessions
    - sessions: Array mit allen Session-Details inkl. Teilnehmer-Info

    Args:
        current_user (User): Der authentifizierte Benutzer
        db (Session): Datenbank-Session

    Returns:
        dict: Vollständige Studiendaten aller Teilnehmer

    Raises:
        HTTPException (403): Wenn der Benutzer kein Administrator ist
    """
    # Administratoren werden ueber ADMIN_USERNAMES in der .env konfiguriert
    if current_user.username not in settings.admin_usernames:
        raise HTTPException(
            status_code=403,
            detail="Nur Administratoren können alle Studiendaten exportieren"
        )
    
    # Import Report model here to avoid circular imports
    from ..models.report_model import Report
    
    # Get ALL sessions from all users
    sessions = db.query(StudySession).join(User).all()
    
    study_data = {
        "study_id": "rad_efficiency_2024",
        "study_version": "1.0",
        "export_date": datetime.utcnow().isoformat(),
        "export_type": "admin_full_export",
        "total_participants": db.query(User).filter(User.study_participant == True).count(),
        "total_sessions": len(sessions),
        "sessions": []
    }
    
    for session in sessions:
        session_data = _build_session_data(session, db, include_user_info=True)
        study_data["sessions"].append(session_data)
    
    return study_data

def _build_session_data(session: StudySession, db: Session, include_user_info: bool = False) -> dict:
    """
    Hilfsfunktion zum Aufbau des Session-Daten-Dictionaries für den Export.

    Erstellt eine strukturierte Darstellung aller Session-Daten für den
    JSON-Export, einschließlich Zeitstempel, Metriken und optional
    des zugehörigen Befunds.

    Args:
        session (StudySession): Die zu exportierende Session
        db (Session): Datenbank-Session
        include_user_info (bool): Benutzer-Info einschließen (für Admin-Export)

    Returns:
        dict: Strukturierte Session-Daten mit allen Metriken
    """
    from ..models.report_model import Report

    session_data = {
        "session_id": session.id,
        "case_id": session.case_id,  # NEW: Case ID for matching AI vs manual
        "session_type": session.session_type,  # NEW: 'with_ai' or 'without_ai'
        "report_id": session.report_id,
        "timestamps": {
            "session_start": session.session_start.isoformat() if session.session_start else None,
            "timer_start": session.timer_start.isoformat() if session.timer_start else None,
            "timer_stop": session.timer_stop.isoformat() if session.timer_stop else None,
            "session_end": session.session_end.isoformat() if session.session_end else None
        },
        "durations": {
            "total_time_seconds": session.total_time_seconds,
            "pause_count": session.pause_count,
            "total_pause_seconds": session.total_pause_seconds
        },
        "metrics": {
            "template_used": session.template_used,
            "input_words": session.input_words,
            "generated_words": session.generated_words,
            "final_words": session.final_words,
            "saved_words": session.saved_words,
            "edit_operations": session.edit_operations,
            "characters_added": session.characters_added,
            "characters_deleted": session.characters_deleted
        },
        "quality": {
            "uninterrupted_work": session.uninterrupted_work,
            "interruption_notes": session.interruption_notes
        }
    }
    
    # Include user info for admin exports
    if include_user_info and session.user:
        session_data["participant"] = {
            "user_id": session.user.id,
            "username": session.user.username,
            "full_name": session.user.full_name,
            "experience_level": session.user.experience_level
        }
    
    # Add report data if available (for AI-generated reports)
    report = _find_report_for_session(session, db)
    if report:
        if True:
            # Get template content if template was used
            template_content = None
            if report.template_id:
                # First try to get from user templates
                from ..models.template_model import UserTemplate
                template = db.query(UserTemplate).filter(UserTemplate.template_id == report.template_id).first()

                if template:
                    template_content = {
                        "id": template.template_id,
                        "title": template.title,
                        "text": template.text,
                        "is_user_template": True
                    }
                else:
                    # Try to get from default templates
                    from ..services.template_service import get_default_templates
                    default_templates = get_default_templates()
                    for dt in default_templates:
                        if dt["id"] == report.template_id:
                            template_content = {
                                "id": dt["id"],
                                "title": dt["title"],
                                "text": dt["text"],
                                "is_user_template": False
                            }
                            break

            # Calculate word counts
            input_word_count = len(report.input_text.split()) if report.input_text else 0
            generated_word_count = len(report.report_text.split()) if report.report_text else 0

            session_data["report"] = {
                "report_id": report.id,
                "is_manual": report.is_manual,
                "input_text": report.input_text,
                # Achtung: historischer Schlüssel - enthält den AKTUELLEN Text (nach Bearbeitung)
                "generated_text": report.report_text,
                "final_text": report.report_text,
                "ai_generated_text": report.ai_generated_text,  # unveränderte KI-Rohausgabe (ab 2026-11-19)
                "input_word_count": input_word_count,
                "generated_word_count": generated_word_count,
                "template_id": report.template_id,
                "template_content": template_content,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "edit_count": report.edit_count,
                "last_edited_at": report.last_edited_at.isoformat() if report.last_edited_at else None,
                "ai": {
                    "provider": report.ai_provider,
                    "model": report.ai_model,
                    "generation_ms": report.generation_ms,
                    "finish_reason": report.ai_finish_reason,
                    "prompt_tokens": report.ai_prompt_tokens,
                    "completion_tokens": report.ai_completion_tokens,
                    "reasoning_tokens": report.ai_reasoning_tokens,
                    "generation_error": report.generation_error,
                    "system_prompt_used": report.system_prompt_used,
                },
            }
    elif session.manual_report_text:
        # For manual sessions without a report_id (stored directly in session)
        manual_word_count = len(session.manual_report_text.split()) if session.manual_report_text else 0
        session_data["report"] = {
            "report_id": None,
            "is_manual": True,
            "manual_text": session.manual_report_text,
            "manual_word_count": manual_word_count,
            "template_id": session.template_used,
            "created_at": session.session_end.isoformat() if session.session_end else None
        }
    else:
        session_data["report"] = None

    # Erweiterte Erfassung (ab 2026-11-19)
    session_data["status"] = session.status or ("completed" if session.session_end else "started")
    session_data["platform_version"] = session.platform_version
    session_data["timestamps"]["first_generation"] = (
        session.first_generation.isoformat() if session.first_generation else None
    )
    session_data["durations"]["active_time_seconds"] = session.active_time_seconds
    session_data["metrics"]["modifications_ratio"] = session.modifications_ratio
    session_data["post_completion_editing"] = {
        "edit_count": session.post_edit_count,
        "edit_seconds": session.post_edit_seconds,
        "final_words_after_edit": session.final_words_after_edit,
        "last_edit_at": session.last_edit_at.isoformat() if session.last_edit_at else None,
    }
    session_data["client_metrics"] = session.client_metrics
    session_data["versions"] = [
        {
            "version_no": v.version_no,
            "source": v.source,
            "report_id": v.report_id,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "words": v.words,
            "chars": v.chars,
            "chars_added": v.chars_added,
            "chars_deleted": v.chars_deleted,
            "similarity_to_original": v.similarity_to_original,
            "client_edit_ms": v.client_edit_ms,
            "client_meta": v.client_meta,
            "text": v.text,
        }
        for v in db.query(ReportVersion)
        .filter(ReportVersion.study_session_id == session.id)
        .order_by(ReportVersion.report_id, ReportVersion.version_no)
        .all()
    ]
    session_data["events"] = [
        {
            "type": e.event_type,
            "client_ts": e.client_ts.isoformat() if e.client_ts else None,
            "server_ts": e.server_ts.isoformat() if e.server_ts else None,
            "report_id": e.report_id,
            "payload": e.payload,
        }
        # Browser-Ereignisse werden gebündelt gesendet -> nach Browser-Zeitpunkt sortieren
        for e in sorted(
            db.query(StudyEvent).filter(StudyEvent.study_session_id == session.id).all(),
            key=lambda ev: (ev.client_ts or ev.server_ts, ev.id),
        )
    ]

    return session_data


def _find_report_for_session(session: StudySession, db: Session):
    """Befund einer Session: über study_sessions.report_id oder reports.study_session_id."""
    from ..models.report_model import Report
    if session.report_id:
        report = db.query(Report).filter(Report.id == session.report_id).first()
        if report:
            return report
    return (
        db.query(Report)
        .filter(Report.study_session_id == session.id)
        .order_by(Report.id)
        .first()
    )


# Spalten des CSV-Exports (eine Zeile pro Session)
_CSV_COLUMNS = [
    "session_id", "user_id", "username", "experience_level", "case_id", "session_type", "status",
    "platform_version", "session_start", "first_generation", "session_end",
    "total_time_seconds", "pause_count", "total_pause_seconds", "active_time_seconds",
    "template_used", "report_id", "report_deleted",
    "input_words", "ai_words", "final_words_at_completion", "final_words_after_edit",
    "post_edit_count", "post_edit_seconds", "chars_added_vs_original", "chars_deleted_vs_original",
    "edit_operations", "modifications_ratio",
    "ai_model", "generation_ms", "ai_finish_reason", "generation_error",
    "ai_prompt_tokens", "ai_completion_tokens", "ai_reasoning_tokens",
    "client_keystrokes", "client_chars_typed", "client_chars_removed", "client_paste_count",
    "client_pasted_chars", "client_hidden_seconds", "client_hidden_count", "client_idle_seconds",
    "client_first_input_after_s", "client_generate_clicked_after_s", "client_copy_count",
    "flag_incomplete", "flag_generation_error", "flag_long_hidden", "flag_mostly_pasted",
    "flag_long_session",
]


def _session_csv_row(session: StudySession, db: Session) -> dict:
    report = _find_report_for_session(session, db)
    cm = session.client_metrics or {}
    deleted = db.query(StudyEvent.id).filter(
        StudyEvent.study_session_id == session.id, StudyEvent.event_type == "report_deleted"
    ).first() is not None
    copy_count = db.query(StudyEvent).filter(
        StudyEvent.study_session_id == session.id, StudyEvent.event_type == "report_copied"
    ).count()
    final_chars = len(report.report_text) if report and report.report_text else 0
    pasted = cm.get("pasted_chars") or 0
    hidden_s = round((cm.get("hidden_ms") or 0) / 1000, 1)
    active = session.active_time_seconds if session.active_time_seconds is not None else session.total_time_seconds

    def iso(dt):
        return dt.isoformat(sep=" ", timespec="seconds") if dt else ""

    def secs(ms_key):
        v = cm.get(ms_key)
        return round(v / 1000, 1) if isinstance(v, (int, float)) else ""

    return {
        "session_id": session.id,
        "user_id": session.user_id,
        "username": session.user.username if session.user else "",
        "experience_level": session.user.experience_level if session.user else "",
        "case_id": session.case_id or "",
        "session_type": session.session_type or "",
        "status": session.status or ("completed" if session.session_end else "started"),
        "platform_version": session.platform_version or "",
        "session_start": iso(session.session_start),
        "first_generation": iso(session.first_generation),
        "session_end": iso(session.session_end),
        "total_time_seconds": session.total_time_seconds,
        "pause_count": session.pause_count,
        "total_pause_seconds": session.total_pause_seconds,
        "active_time_seconds": session.active_time_seconds,
        "template_used": session.template_used or "",
        "report_id": report.id if report else "",
        "report_deleted": int(deleted),
        "input_words": report.input_words if report else session.input_words,
        "ai_words": report.generated_words if report and not report.is_manual else 0,
        "final_words_at_completion": session.final_words,
        "final_words_after_edit": session.final_words_after_edit,
        "post_edit_count": session.post_edit_count,
        "post_edit_seconds": session.post_edit_seconds,
        "chars_added_vs_original": session.characters_added,
        "chars_deleted_vs_original": session.characters_deleted,
        "edit_operations": session.edit_operations,
        "modifications_ratio": session.modifications_ratio,
        "ai_model": report.ai_model if report else "",
        "generation_ms": report.generation_ms if report else "",
        "ai_finish_reason": report.ai_finish_reason if report else "",
        "generation_error": int(bool(report.generation_error)) if report and report.generation_error is not None else "",
        "ai_prompt_tokens": report.ai_prompt_tokens if report else "",
        "ai_completion_tokens": report.ai_completion_tokens if report else "",
        "ai_reasoning_tokens": report.ai_reasoning_tokens if report else "",
        "client_keystrokes": cm.get("keystrokes", ""),
        "client_chars_typed": cm.get("chars_typed", ""),
        "client_chars_removed": cm.get("chars_removed", ""),
        "client_paste_count": cm.get("paste_count", ""),
        "client_pasted_chars": cm.get("pasted_chars", ""),
        "client_hidden_seconds": hidden_s if cm else "",
        "client_hidden_count": cm.get("hidden_count", ""),
        "client_idle_seconds": secs("idle_ms"),
        "client_first_input_after_s": secs("first_input_after_ms"),
        "client_generate_clicked_after_s": secs("generate_clicked_after_ms"),
        "client_copy_count": copy_count,
        "flag_incomplete": int(session.session_end is None),
        "flag_generation_error": int(bool(report and report.generation_error)),
        "flag_long_hidden": int(hidden_s > 60),
        "flag_mostly_pasted": int(final_chars > 0 and pasted > 0.5 * final_chars),
        "flag_long_session": int(active is not None and active > 1200),
    }


@router.get("/study-data/export-all.csv")
async def export_all_study_data_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CSV-Export aller Sessions (nur Administratoren): eine Zeile pro Session mit
    Zeit-, Bearbeitungs-, KI- und Browser-Metriken sowie Qualitäts-Flags.
    Trennzeichen Semikolon, UTF-8 mit BOM (öffnet direkt in Excel).
    """
    if current_user.username not in settings.admin_usernames:
        raise HTTPException(
            status_code=403,
            detail="Nur Administratoren können alle Studiendaten exportieren"
        )
    sessions = db.query(StudySession).order_by(StudySession.id).all()
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_CSV_COLUMNS, delimiter=";", extrasaction="ignore")
    writer.writeheader()
    for session in sessions:
        writer.writerow(_session_csv_row(session, db))
    filename = f"studiendaten_{datetime.utcnow():%Y%m%d_%H%M}.csv"
    return Response(
        content="\ufeff" + buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )