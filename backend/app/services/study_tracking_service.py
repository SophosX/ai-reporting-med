"""
Study Tracking Service - Hilfsfunktionen für die erweiterte Studien-Erfassung.

- Befund-Versionen (KI-Rohausgabe, Erstfassung, jede Bearbeitung) mit Diff-Metriken
- Nachbearbeitungs-Metriken an der Studien-Session
- Server-seitige Ereignisse (KI-Generierung, PDF, Löschen)
- Plattform-Version (Git-Commit) zur Kennzeichnung der Datenerhebung

Hinzugefügt 2026-11-19.
"""

import difflib
import os
from datetime import datetime
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session

from ..models.study_session import StudySession
from ..models.study_tracking import ReportVersion, StudyEvent
from .word_count_service import count_words

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


@lru_cache(maxsize=1)
def platform_version() -> Optional[str]:
    """Kurzer Git-Commit-Hash des laufenden Codes (liest .git direkt, ohne git-Aufruf)."""
    try:
        git_dir = os.path.join(_REPO_ROOT, ".git")
        with open(os.path.join(git_dir, "HEAD")) as f:
            head = f.read().strip()
        if not head.startswith("ref:"):
            return head[:12]
        ref = head.split(" ", 1)[1]
        ref_path = os.path.join(git_dir, ref)
        if os.path.exists(ref_path):
            with open(ref_path) as f:
                return f.read().strip()[:12]
        packed = os.path.join(git_dir, "packed-refs")
        if os.path.exists(packed):
            with open(packed) as f:
                for line in f:
                    if line.strip().endswith(ref):
                        return line.split(" ", 1)[0][:12]
    except OSError:
        pass
    return None


def text_diff_stats(old: str, new: str) -> dict:
    """
    Zeichenbasierter Vergleich zweier Texte.

    Returns:
        dict: chars_added, chars_deleted, edit_operations (Anzahl geänderter
        Abschnitte), similarity (0..1, difflib ratio)
    """
    old = old or ""
    new = new or ""
    matcher = difflib.SequenceMatcher(None, old, new, autojunk=False)
    added = deleted = ops = 0
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        ops += 1
        if tag in ("replace", "delete"):
            deleted += i2 - i1
        if tag in ("replace", "insert"):
            added += j2 - j1
    return {
        "chars_added": added,
        "chars_deleted": deleted,
        "edit_operations": ops,
        "similarity": round(matcher.ratio(), 4),
    }


def find_session_for_report(db: Session, report) -> Optional[StudySession]:
    """Studien-Session eines Befunds (direkte Verknüpfung oder über study_sessions.report_id)."""
    if report.study_session_id:
        session = db.query(StudySession).filter(StudySession.id == report.study_session_id).first()
        if session:
            return session
    return (
        db.query(StudySession)
        .filter(StudySession.report_id == report.id)
        .order_by(StudySession.id.desc())
        .first()
    )


def get_owned_session(db: Session, session_id: Optional[int], user_id: int) -> Optional[StudySession]:
    if not session_id:
        return None
    return (
        db.query(StudySession)
        .filter(StudySession.id == session_id, StudySession.user_id == user_id)
        .first()
    )


def record_version(
    db: Session,
    report,
    source: str,
    text: str,
    session: Optional[StudySession] = None,
    client_edit_ms: Optional[int] = None,
    client_meta: Optional[dict] = None,
    created_at: Optional[datetime] = None,
) -> ReportVersion:
    """Speichert einen Befund-Stand inkl. Änderungen zur Vor- und zur Erstfassung (ohne commit)."""
    previous = (
        db.query(ReportVersion)
        .filter(ReportVersion.report_id == report.id)
        .order_by(ReportVersion.version_no.desc())
        .first()
    )
    original = (
        db.query(ReportVersion)
        .filter(ReportVersion.report_id == report.id, ReportVersion.version_no == 0)
        .first()
    )
    version = ReportVersion(
        report_id=report.id,
        study_session_id=session.id if session else report.study_session_id,
        user_id=report.user_id,
        version_no=(previous.version_no + 1) if previous else 0,
        source=source,
        text=text or "",
        words=count_words(text or ""),
        chars=len(text or ""),
        client_edit_ms=client_edit_ms,
        client_meta=client_meta,
        created_at=created_at or datetime.utcnow(),
    )
    if previous:
        diff_prev = text_diff_stats(previous.text, text)
        version.chars_added = diff_prev["chars_added"]
        version.chars_deleted = diff_prev["chars_deleted"]
    if original:
        version.similarity_to_original = text_diff_stats(original.text, text)["similarity"]
    else:
        version.similarity_to_original = 1.0
    db.add(version)
    db.flush()
    return version


def update_session_edit_metrics(db: Session, session: StudySession, report) -> None:
    """
    Aktualisiert die Nachbearbeitungs-Metriken einer Session aus den Befund-Versionen.

    characters_added/deleted, edit_operations und modifications_ratio beziehen sich
    auf den Vergleich Erstfassung (KI-Rohausgabe bzw. erster manueller Stand) -> aktueller Text.
    """
    versions = (
        db.query(ReportVersion)
        .filter(ReportVersion.report_id == report.id)
        .order_by(ReportVersion.version_no)
        .all()
    )
    if not versions:
        return
    original, latest = versions[0], versions[-1]
    edits = [v for v in versions if v.source == "edit"]
    diff = text_diff_stats(original.text, latest.text)
    session.characters_added = diff["chars_added"]
    session.characters_deleted = diff["chars_deleted"]
    session.edit_operations = diff["edit_operations"]
    session.modifications_ratio = round(1 - diff["similarity"], 4)
    session.post_edit_count = len(edits)
    session.post_edit_seconds = int(sum((v.client_edit_ms or 0) for v in edits) / 1000) if edits else 0
    session.final_words_after_edit = latest.words
    session.last_edit_at = edits[-1].created_at if edits else None


def log_server_event(
    db: Session,
    user_id: int,
    event_type: str,
    session_id: Optional[int] = None,
    report_id: Optional[int] = None,
    payload: Optional[dict] = None,
) -> None:
    """Server-seitiges Studien-Ereignis (ohne commit)."""
    db.add(
        StudyEvent(
            user_id=user_id,
            study_session_id=session_id,
            report_id=report_id,
            event_type=event_type,
            client_ts=None,
            server_ts=datetime.utcnow(),
            payload=payload,
        )
    )
