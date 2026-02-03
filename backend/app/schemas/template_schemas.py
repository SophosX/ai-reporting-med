"""
Template Schemas - Pydantic-Modelle für Template-bezogene API-Anfragen und -Antworten.

Dieses Modul definiert alle Pydantic-Schemas für benutzerdefinierte Templates:
- Basis-Schema (UserTemplateBase)
- Template-Erstellung (UserTemplateCreate)
- Template-Aktualisierung (UserTemplateUpdate)
- System-Template-Override (DefaultTemplateOverride)
- Template-Ausgabe (UserTemplateOut)

Templates können sowohl komplett neu erstellt als auch als Überschreibungen
von System-Standard-Templates angelegt werden.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserTemplateBase(BaseModel):
    """
    Basis-Schema für benutzerdefinierte Templates.

    Enthält alle gemeinsamen Felder für Template-Erstellung und -Ausgabe.

    Attributes:
        title (str): Anzeigename des Templates (z.B. "Mein CT Thorax")
        template_id (str, optional): Eindeutige ID für API-Zugriff
            - Wird automatisch aus dem Titel generiert wenn nicht angegeben
        text (str): Vollständiger Template-Text mit Struktur/Platzhaltern
        is_default_override (bool): True wenn dieses Template ein System-Template überschreibt
        default_template_id (str, optional): ID des überschriebenen System-Templates
            - Nur relevant wenn is_default_override=True
    """
    title: str
    template_id: Optional[str] = None
    text: str
    is_default_override: bool = False
    default_template_id: Optional[str] = None


class UserTemplateCreate(UserTemplateBase):
    """
    Schema für die Template-Erstellung.

    Erbt alle Felder von UserTemplateBase. Wird bei POST /user-templates verwendet.

    Beispiel-Verwendung:
        {
            "title": "CT Abdomen Custom",
            "text": "BEFUND:\\n\\nLeber: ...\\nMilz: ...",
            "is_default_override": false
        }

    Für System-Template-Override:
        {
            "title": "Mein CT Thorax (angepasst)",
            "text": "...",
            "is_default_override": true,
            "default_template_id": "ct-thorax-standard"
        }
    """
    pass


class UserTemplateUpdate(BaseModel):
    """
    Schema für die Template-Aktualisierung.

    Alle Felder sind optional - nur angegebene Felder werden aktualisiert.

    Attributes:
        title (str, optional): Neuer Anzeigename
        text (str, optional): Neuer Template-Text
    """
    title: Optional[str] = None
    text: Optional[str] = None


class DefaultTemplateOverride(BaseModel):
    """
    Schema für das Überschreiben eines System-Standard-Templates.

    Ermöglicht Benutzern, ein System-Template anzupassen, ohne es
    komplett neu zu erstellen. Das Original-Template bleibt erhalten.

    Attributes:
        title (str, optional): Angepasster Titel (falls abweichend vom Original)
        text (str, optional): Angepasster Template-Text
    """
    title: Optional[str] = None
    text: Optional[str] = None


class UserTemplateOut(UserTemplateBase):
    """
    Schema für die Template-Ausgabe in API-Antworten.

    Erbt alle Felder von UserTemplateBase und fügt Metadaten hinzu.

    Attributes:
        id (int): Eindeutige Datenbank-ID
        user_id (int): ID des Besitzer-Benutzers
        created_at (datetime): Erstellungszeitpunkt
        updated_at (datetime, optional): Zeitpunkt der letzten Änderung
        + alle Felder von UserTemplateBase

    Config:
        orm_mode: Ermöglicht direkte Konvertierung von SQLAlchemy-Objekten
    """
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
