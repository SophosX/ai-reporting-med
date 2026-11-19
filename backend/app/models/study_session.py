"""
Study Session Model - Datenbankmodell für wissenschaftliche Studien-Sessions.

Dieses Modul definiert das SQLAlchemy ORM-Modell für detaillierte Tracking-Daten
von Befunderstellungs-Sessions im Rahmen wissenschaftlicher Studien. Es erfasst
Zeitmetriken, Bearbeitungsstatistiken und Qualitätsbewertungen.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base
from datetime import datetime


class StudySession(Base):
    """
    SQLAlchemy Model für wissenschaftliche Studien-Sessions.

    Diese Klasse erfasst detaillierte Metriken während einer Befunderstellung
    für wissenschaftliche Auswertungen. Sie ermöglicht den Vergleich zwischen
    KI-unterstützter und manueller Befunderstellung.

    Session-Ablauf (typisch):
        1. session_start: Benutzer öffnet Befunderstellungsseite
        2. timer_start: Benutzer startet aktiv den Timer
        3. first_generation: Erste KI-Generierung (nur bei with_ai)
        4. editing_start: Benutzer beginnt mit Bearbeitung
        5. timer_stop: Benutzer stoppt Timer (Befund fertig)
        6. session_end: Session wird gespeichert

    Attributes:
        id (int): Primärschlüssel
        user_id (int): Fremdschlüssel zum Studienteilnehmer
        report_id (int, optional): Fremdschlüssel zum erstellten Befund

    Zeitstempel-Felder (Session-Phasen):
        session_start (datetime): Start der gesamten Session
        timer_start (datetime, optional): Start des aktiven Timers
        first_generation (datetime, optional): Zeitpunkt der ersten KI-Generierung
        editing_start (datetime, optional): Beginn der Bearbeitungsphase
        timer_stop (datetime, optional): Ende der aktiven Arbeit
        session_end (datetime, optional): Finale Speicherung der Session

    Zeitdauer-Metriken (in Sekunden):
        total_time_seconds (int): Gesamtdauer der Session
        input_time_seconds (int): Zeit für Eingabe der Stichpunkte
        editing_time_seconds (int): Zeit für Bearbeitung des generierten Textes
        idle_time_seconds (int): Inaktive Zeit (keine Tastatureingaben)
        pause_count (int): Anzahl der Pausen während der Session
        total_pause_seconds (int): Gesamte Pausenzeit

    Report-Metriken (Textanalyse):
        template_used (str): ID des verwendeten Templates
        input_words (int): Anzahl Wörter im Eingabetext
        generated_words (int): Anzahl KI-generierter Wörter
        final_words (int): Anzahl Wörter im finalen Befund
        saved_words (int): Eingesparte Wörter (final - input)
        edit_operations (int): Anzahl Bearbeitungsoperationen
        characters_added (int): Anzahl hinzugefügter Zeichen
        characters_deleted (int): Anzahl gelöschter Zeichen

    Qualitätsmetriken:
        completeness_score (float): Vollständigkeitsbewertung (0.0-1.0)
        modifications_ratio (float): Verhältnis Änderungen/Originaltext

    Selbstbewertung (vom Arzt ausgefüllt):
        uninterrupted_work (bool): Wurde ohne Unterbrechung gearbeitet?
        quality_self_assessment (str): Selbsteinschätzung der Qualität
            - 'excellent': Sehr gute Qualität
            - 'good': Gute Qualität
            - 'fair': Akzeptable Qualität
            - 'poor': Verbesserungswürdig
        interruption_notes (str): Freitext zu Unterbrechungen

    Rohdaten:
        session_data (JSON): Vollständige Session-Daten als JSON für spätere Analyse

    Fallvergleich-Felder (für KI vs. Manual Vergleiche):
        case_id (str): Vom Arzt vergebene Fall-ID für Zuordnung
        session_type (str): Art der Session
            - 'with_ai': KI-unterstützte Befunderstellung
            - 'without_ai': Rein manuelle Befunderstellung
        manual_report_text (str): Befundtext bei manueller Erstellung

    Relationships:
        user: Beziehung zum Studienteilnehmer
        report: Beziehung zum erstellten Befund (falls vorhanden)
    """
    __tablename__ = "study_sessions"

    # Primärschlüssel
    id = Column(Integer, primary_key=True, index=True)

    # Fremdschlüssel
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)

    # Session-Zeitstempel (chronologischer Ablauf)
    session_start = Column(DateTime, nullable=False)  # Session geöffnet
    timer_start = Column(DateTime, nullable=True)  # Timer gestartet
    first_generation = Column(DateTime, nullable=True)  # Erste KI-Generierung
    editing_start = Column(DateTime, nullable=True)  # Bearbeitung begonnen
    timer_stop = Column(DateTime, nullable=True)  # Timer gestoppt
    session_end = Column(DateTime, nullable=True)  # Session beendet

    # Zeitdauer-Metriken (alle in Sekunden)
    total_time_seconds = Column(Integer, nullable=True)  # Gesamtzeit
    input_time_seconds = Column(Integer, nullable=True)  # Eingabephase
    editing_time_seconds = Column(Integer, nullable=True)  # Bearbeitungsphase
    idle_time_seconds = Column(Integer, nullable=True)  # Inaktive Zeit
    pause_count = Column(Integer, default=0)  # Anzahl Pausen
    total_pause_seconds = Column(Integer, default=0)  # Gesamte Pausenzeit

    # Report-Metriken (Textanalyse)
    template_used = Column(String(255), nullable=True)  # Template-ID
    input_words = Column(Integer, nullable=True)  # Eingabewörter
    generated_words = Column(Integer, nullable=True)  # KI-generierte Wörter
    final_words = Column(Integer, nullable=True)  # Finale Wortanzahl
    saved_words = Column(Integer, nullable=True)  # Eingesparte Wörter
    edit_operations = Column(Integer, default=0)  # Bearbeitungsoperationen
    characters_added = Column(Integer, default=0)  # Hinzugefügte Zeichen
    characters_deleted = Column(Integer, default=0)  # Gelöschte Zeichen

    # Qualitätsmetriken (automatisch berechnet)
    completeness_score = Column(Float, nullable=True)  # 0.0-1.0
    modifications_ratio = Column(Float, nullable=True)  # Änderungsrate

    # Selbstbewertung durch den Arzt
    uninterrupted_work = Column(Boolean, nullable=True)  # Ohne Unterbrechung?
    quality_self_assessment = Column(String(50), nullable=True)  # excellent/good/fair/poor
    interruption_notes = Column(Text, nullable=True)  # Freitext zu Unterbrechungen

    # Rohdaten-Speicher für detaillierte Analyse
    session_data = Column(JSON, nullable=True)  # Komplette Session als JSON

    # Fallvergleich-Felder (hinzugefügt 2025-12-09)
    case_id = Column(String(100), nullable=True)  # Fall-ID vom Arzt
    session_type = Column(String(50), nullable=True)  # 'with_ai' oder 'without_ai'
    manual_report_text = Column(Text, nullable=True)  # Manueller Befundtext

    # Erweiterte Erfassung (hinzugefügt 2026-11-19)
    status = Column(String(20), nullable=True)  # started / completed / cancelled
    active_time_seconds = Column(Integer, nullable=True)  # total_time_seconds - total_pause_seconds
    client_metrics = Column(JSON, nullable=True)  # Browser-Zählwerte (Tippen, Einfügen, Tab-Wechsel, Leerlauf)
    platform_version = Column(String(40), nullable=True)  # Git-Commit der Plattform bei Erfassung
    # Nachbearbeitung NACH Abschluss der Session (KI-Arm: Session endet mit der Generierung)
    post_edit_count = Column(Integer, nullable=True)  # Anzahl gespeicherter Bearbeitungen
    post_edit_seconds = Column(Integer, nullable=True)  # Summe Bearbeitungsdauer (Bearbeiten -> Speichern)
    final_words_after_edit = Column(Integer, nullable=True)  # Wortzahl nach letzter Bearbeitung
    last_edit_at = Column(DateTime, nullable=True)

    # Beziehungen
    user = relationship("User", backref="study_sessions")
    # foreign_keys nötig, weil reports.study_session_id einen zweiten FK-Pfad erzeugt
    report = relationship("Report", foreign_keys=[report_id], backref="study_session")
