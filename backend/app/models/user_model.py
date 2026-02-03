"""
User Model - Datenbankmodell für Benutzer der Medical Report Assistant Anwendung.

Dieses Modul definiert das SQLAlchemy ORM-Modell für Benutzer, einschließlich
Authentifizierungsdaten, Studienteilnahme-Informationen und Beziehungen zu
anderen Entitäten wie Templates und Reports.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, func
from sqlalchemy.orm import relationship
from ..core.database import Base
from datetime import datetime


class User(Base):
    """
    SQLAlchemy Model für Benutzer der Anwendung.

    Diese Klasse repräsentiert einen Benutzer im System und speichert:
    - Authentifizierungsdaten (Username, Email, Passwort-Hash)
    - Individuelle KI-Einstellungen (Custom Prompt)
    - Studienteilnahme-Metadaten für wissenschaftliche Auswertungen

    Attributes:
        id (int): Primärschlüssel, automatisch generiert
        username (str): Eindeutiger Benutzername für Login (max. 255 Zeichen)
        email (str): Eindeutige E-Mail-Adresse des Benutzers (max. 255 Zeichen)
        password (str): BCrypt-gehashtes Passwort (max. 255 Zeichen)
        custom_prompt (str, optional): Benutzerdefinierter System-Prompt für die KI-Generierung
        created_at (datetime): Zeitstempel der Kontoerstellung (automatisch gesetzt)

    Study-Attributes (für wissenschaftliche Studien):
        study_participant (bool): True wenn Benutzer an Studie teilnimmt
        study_token (str, optional): Eindeutiger Token für Studien-Authentifizierung
        experience_level (str, optional): Erfahrungsstufe des Arztes
            - 'assistenzarzt': Arzt in Weiterbildung
            - 'facharzt': Facharzt für Radiologie
            - 'oberarzt': Oberarzt/Leitende Position
        full_name (str, optional): Vollständiger Name für Studiendokumentation
        study_mode_active (bool): True wenn Benutzer gerade in einer Studien-Session ist

    Relationships:
        templates: Liste der benutzerdefinierten Templates (1:n Beziehung)
        reports: Liste der erstellten Befunde (1:n Beziehung)
    """
    __tablename__ = "users"

    # Primärschlüssel
    id = Column(Integer, primary_key=True, index=True)

    # Authentifizierungsdaten
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)  # BCrypt-Hash, nicht Klartext

    # KI-Personalisierung
    custom_prompt = Column(Text, nullable=True)  # Optionaler System-Prompt für OpenAI

    # Metadaten
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Studien-bezogene Felder für wissenschaftliche Auswertungen
    study_participant = Column(Boolean, default=False, nullable=False)  # Studienteilnehmer-Flag
    study_token = Column(String(255), nullable=True)  # Separater Auth-Token für Studien
    experience_level = Column(String(50), nullable=True)  # Erfahrungsstufe: assistenzarzt/facharzt/oberarzt
    full_name = Column(String(255), nullable=True)  # Vollständiger Name für Studiendokumentation
    study_mode_active = Column(Boolean, default=False, nullable=False)  # Aktive Studien-Session läuft

    # Beziehungen zu anderen Tabellen
    templates = relationship("UserTemplate", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user")
