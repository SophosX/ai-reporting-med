"""
Report Model - Datenbankmodell für radiologische Befundberichte.

Dieses Modul definiert das SQLAlchemy ORM-Modell für Befundberichte, die entweder
KI-generiert oder manuell erstellt wurden. Es speichert den vollständigen Befund,
Metadaten zur Generierung und Metriken für die wissenschaftliche Auswertung.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class Report(Base):
    """
    SQLAlchemy Model für radiologische Befundberichte.

    Diese Klasse speichert sowohl KI-generierte als auch manuell erstellte Befunde.
    Sie enthält den vollständigen Text, das verwendete Template, Wortanzahl-Metriken
    und Studien-bezogene Tracking-Informationen.

    Attributes:
        id (int): Primärschlüssel, automatisch generiert
        input_text (str): Eingabetext des Radiologen (Stichpunkte/Notizen)
        report_text (str): Finaler Befundtext nach KI-Generierung oder manuellem Schreiben
        template_id (str, optional): ID des verwendeten Befund-Templates
        template_text (str, optional): Vollständiger Text des Templates zum Zeitpunkt der Erstellung
        created_at (datetime): Zeitstempel der Berichterstellung
        user_id (int): Fremdschlüssel zum erstellenden Benutzer

    Word Count Metriken (für Effizienzanalyse):
        input_words (int): Anzahl Wörter im Eingabetext des Radiologen
        total_words (int): Gesamte Wortanzahl im finalen Befund
        generated_words (int): Anzahl der KI-generierten Wörter
        saved_words (int): Eingesparte Wörter (total_words - input_words)

    Studien-Felder (für wissenschaftliche Vergleiche):
        is_manual (bool): True = manuell geschrieben, False = KI-generiert
        case_id (str, optional): Fall-ID für Zuordnung von KI- vs Manual-Reports zum selben Fall
        study_duration_seconds (int, optional): Gesamtdauer der Studiensession in Sekunden

    Relationships:
        user: Beziehung zum erstellenden Benutzer (n:1)
    """
    __tablename__ = "reports"

    # Primärschlüssel
    id = Column(Integer, primary_key=True, index=True)

    # Befundinhalte
    input_text = Column(Text, nullable=False)  # Rohdaten/Stichpunkte vom Radiologen
    report_text = Column(Text, nullable=False)  # Finaler, ausformulierter Befund

    # Template-Referenz
    template_id = Column(String(50), nullable=True)  # z.B. "ct-thorax-standard"
    template_text = Column(Text, nullable=True)  # Snapshot des Templates bei Erstellung

    # Metadaten
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Wortanzahl-Metriken für Effizienzanalyse
    input_words = Column(Integer, default=0)  # Eingabewörter des Radiologen
    total_words = Column(Integer, default=0)  # Gesamtwörter im finalen Befund
    generated_words = Column(Integer, default=0)  # Von KI generierte Wörter
    saved_words = Column(Integer, default=0)  # Zeitersparnis: final - input

    # Studienvergleich: KI vs. manuell (hinzugefügt 2025-12-09)
    is_manual = Column(Boolean, default=False)  # True = ohne KI, False = mit KI

    # Studien-Session-Tracking (hinzugefügt 2025-12-26)
    case_id = Column(String(100), nullable=True)  # Fall-ID für Paarbildung KI/Manual
    study_duration_seconds = Column(Integer, nullable=True)  # Session-Dauer in Sekunden

    # Erweiterte Studien-Erfassung (hinzugefügt 2026-11-19)
    # Direkte Verknüpfung zur Studien-Session (wird schon bei Erstellung gesetzt,
    # nicht erst beim Abschluss der Session)
    study_session_id = Column(
        Integer,
        ForeignKey("study_sessions.id", use_alter=True, name="fk_reports_study_session"),
        nullable=True,
    )
    # Unveränderte KI-Rohausgabe - report_text wird bei Bearbeitung überschrieben,
    # dieses Feld nie. Basis für die Messung des Nachbearbeitungsaufwands.
    ai_generated_text = Column(Text, nullable=True)
    ai_provider = Column(String(50), nullable=True)  # openai / azure / uni
    ai_model = Column(String(100), nullable=True)  # z.B. gpt-5
    system_prompt_used = Column(Text, nullable=True)  # Effektiver System-Prompt inkl. Template
    generation_ms = Column(Integer, nullable=True)  # Server-seitige KI-Antwortzeit in ms
    ai_finish_reason = Column(String(50), nullable=True)  # stop / length / content_filter ...
    ai_prompt_tokens = Column(Integer, nullable=True)
    ai_completion_tokens = Column(Integer, nullable=True)
    ai_reasoning_tokens = Column(Integer, nullable=True)
    generation_error = Column(Boolean, nullable=True)  # True = Fehlertext oder leere KI-Antwort
    edit_count = Column(Integer, nullable=True)  # Anzahl gespeicherter Bearbeitungen nach Erstellung
    last_edited_at = Column(DateTime, nullable=True)

    # Beziehung zum Benutzer
    user = relationship("User", back_populates="reports")
