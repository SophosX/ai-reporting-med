"""
Template Model - Datenbankmodell für benutzerdefinierte Befund-Templates.

Dieses Modul definiert das SQLAlchemy ORM-Modell für benutzerspezifische Templates.
Es unterstützt sowohl komplett neue Templates als auch Überschreibungen von
System-Standard-Templates durch individuelle Benutzeranpassungen.
"""

from sqlalchemy import Column, Integer, Text, String, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from ..core.database import Base


class UserTemplate(Base):
    """
    SQLAlchemy Model für benutzerdefinierte Befund-Templates.

    Diese Klasse speichert individuelle Templates, die Benutzer erstellt haben.
    Templates können entweder komplett neu sein oder Überschreibungen von
    Standard-System-Templates darstellen (z.B. angepasste Version von "CT Thorax Standard").

    Template-Typen:
        1. Benutzerdefiniert: Komplett neue Templates (is_default_override=False)
        2. Override: Anpassungen von System-Templates (is_default_override=True)
           - Diese haben zusätzlich default_template_id gesetzt
           - Werden anstelle des System-Templates angezeigt

    Attributes:
        id (int): Primärschlüssel, automatisch generiert
        user_id (int): Fremdschlüssel zum Besitzer des Templates
        title (str): Anzeigename des Templates (max. 255 Zeichen)
        template_id (str): Eindeutige ID für API-Zugriff (z.B. "user-ct-abdomen-custom")
        text (str): Vollständiger Template-Text mit Platzhaltern/Strukturvorgaben
        created_at (datetime): Zeitstempel der Erstellung
        updated_at (datetime, optional): Zeitstempel der letzten Änderung

    Override-Felder (für System-Template-Anpassungen):
        is_default_override (bool): True wenn dieses Template ein System-Template überschreibt
        default_template_id (str, optional): ID des überschriebenen System-Templates

    Relationships:
        user: Beziehung zum Besitzer-Benutzer (n:1)

    Beispiel:
        Ein Benutzer möchte das Standard "CT Thorax" Template anpassen:
        - is_default_override = True
        - default_template_id = "ct-thorax-standard"
        - Das angepasste Template wird dann anstelle des Standards angezeigt
    """
    __tablename__ = "user_templates"

    # Primärschlüssel
    id = Column(Integer, primary_key=True, index=True)

    # Besitzer-Referenz
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Template-Identifikation
    title = Column(String(255), nullable=False)  # Anzeigename, z.B. "Mein CT Thorax Template"
    template_id = Column(String(255), nullable=False, unique=True)  # Eindeutige ID für API

    # Template-Inhalt
    text = Column(Text, nullable=False)  # Vollständiger Template-Text

    # Zeitstempel
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Override-Funktionalität für System-Template-Anpassungen
    is_default_override = Column(Boolean, default=False)  # True = überschreibt System-Template
    default_template_id = Column(String(255), nullable=True)  # ID des überschriebenen Templates

    # Beziehung zum Besitzer
    user = relationship("User", back_populates="templates") 