"""
Study Tracking Models - Versionen und Ereignisse für die Studien-Auswertung.

ReportVersion: Jeder Stand eines Befunds (KI-Rohausgabe, manueller Erstentwurf,
jede gespeicherte Bearbeitung) mit Zeitstempel und Änderungs-Metriken. Server-seitig
erfasst und damit unabhängig vom Browser zuverlässig.

StudyEvent: Ereignisprotokoll aus dem Browser (Seite geöffnet, Generieren geklickt,
Pause, Tab verlassen, Kopieren ...). Enthält nur Zeitstempel und Zählwerte,
niemals Textinhalte.

Hinzugefügt 2026-11-19.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.dialects.mysql import DATETIME as MYSQL_DATETIME
from datetime import datetime
from ..core.database import Base

# Millisekunden-Genauigkeit unter MySQL, sonst normales DateTime
PreciseDateTime = DateTime().with_variant(MYSQL_DATETIME(fsp=3), "mysql")


class ReportVersion(Base):
    __tablename__ = "report_versions"

    id = Column(Integer, primary_key=True, index=True)
    # SET NULL: löscht ein Teilnehmer den Befund, bleibt der Verlauf für die Studie erhalten
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    study_session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version_no = Column(Integer, nullable=False)  # 0 = Erstfassung
    source = Column(String(20), nullable=False)  # ai / manual / edit
    text = Column(Text, nullable=False)
    words = Column(Integer, nullable=True)
    chars = Column(Integer, nullable=True)
    # Änderung gegenüber der Vorversion
    chars_added = Column(Integer, nullable=True)
    chars_deleted = Column(Integer, nullable=True)
    # Änderung gegenüber der Erstfassung (version 0)
    similarity_to_original = Column(Float, nullable=True)  # 0..1 (difflib ratio)
    client_edit_ms = Column(Integer, nullable=True)  # Browser: Bearbeiten geklickt -> Speichern
    client_meta = Column(JSON, nullable=True)  # Browser-Zählwerte während der Bearbeitung
    created_at = Column(PreciseDateTime, default=datetime.utcnow, nullable=False)


class StudyEvent(Base):
    __tablename__ = "study_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    study_session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)
    client_ts = Column(PreciseDateTime, nullable=True)  # Zeitpunkt im Browser (UTC)
    server_ts = Column(PreciseDateTime, default=datetime.utcnow, nullable=False)
    payload = Column(JSON, nullable=True)  # nur Zählwerte/IDs, keine Textinhalte
