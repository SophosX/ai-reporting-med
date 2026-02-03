"""
User Schemas - Pydantic-Modelle für Benutzer-bezogene API-Anfragen und -Antworten.

Dieses Modul definiert alle Pydantic-Schemas für Benutzeroperationen:
- Registrierung (UserCreate)
- Anmeldung (UserLogin)
- Benutzerausgabe (UserOut)
- Studienmodus (StudyModeToggle)
- Custom Prompt Verwaltung

Die Schemas validieren Eingabedaten und serialisieren Ausgabedaten für die REST-API.
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from enum import Enum


class ExperienceLevel(str, Enum):
    """
    Enum für die Erfahrungsstufe eines Arztes.

    Wird bei der Studienteilnahme erfasst, um Ergebnisse nach
    Erfahrungsniveau zu stratifizieren.

    Values:
        ASSISTENZARZT: Arzt in Weiterbildung (Resident)
        FACHARZT: Facharzt für Radiologie (Attending)
        OBERARZT: Oberarzt/Leitende Position (Senior Attending)
    """
    ASSISTENZARZT = "assistenzarzt"
    FACHARZT = "facharzt"
    OBERARZT = "oberarzt"


class UserCreate(BaseModel):
    """
    Schema für die Benutzerregistrierung.

    Validiert die Eingabedaten bei der Kontoerstellung und prüft,
    dass die Passwörter übereinstimmen.

    Attributes:
        username (str): Gewünschter Benutzername (eindeutig)
        email (EmailStr): E-Mail-Adresse (wird auf Format geprüft)
        password (str): Gewähltes Passwort
        password_confirm (str): Passwortbestätigung (muss mit password übereinstimmen)
        full_name (str, optional): Vollständiger Name (für Studienteilnehmer)
        study_token (str, optional): Studien-Token für Studienteilnahme
        experience_level (ExperienceLevel, optional): Erfahrungsstufe des Arztes
    """
    username: str
    email: EmailStr
    password: str
    password_confirm: str

    # Studien-Felder - optional bei der Registrierung
    full_name: Optional[str] = None
    study_token: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None

    @validator('password_confirm')
    def passwords_match(cls, v, values, **kwargs):
        """
        Validator: Prüft, ob password und password_confirm identisch sind.

        Args:
            v: Der Wert von password_confirm
            values: Dictionary mit bereits validierten Feldern

        Returns:
            str: Der validierte Wert von password_confirm

        Raises:
            ValueError: Wenn die Passwörter nicht übereinstimmen
        """
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class UserLogin(BaseModel):
    """
    Schema für die Benutzeranmeldung.

    Unterstützt Login sowohl mit Benutzername als auch mit E-Mail-Adresse.

    Attributes:
        identifier (str): Benutzername ODER E-Mail-Adresse
        password (str): Benutzerpasswort
    """
    identifier: str  # Kann entweder eine Email oder ein Username sein
    password: str


class UserOut(BaseModel):
    """
    Schema für die Benutzerausgabe in API-Antworten.

    Enthält alle öffentlichen Benutzerinformationen, OHNE sensible Daten
    wie das Passwort. Wird bei erfolgreicher Anmeldung und für
    Benutzerprofil-Anfragen verwendet.

    Attributes:
        id (int): Eindeutige Benutzer-ID
        username (str): Benutzername
        email (EmailStr): E-Mail-Adresse
        custom_prompt (str, optional): Benutzerdefinierter KI-Prompt
        study_participant (bool): True wenn Studienteilnehmer
        study_mode_active (bool): True wenn Studienmodus aktiv ist
        experience_level (str, optional): Erfahrungsstufe des Arztes
        full_name (str, optional): Vollständiger Name

    Config:
        orm_mode: Ermöglicht direkte Konvertierung von SQLAlchemy-Objekten
    """
    id: int
    username: str
    email: EmailStr
    custom_prompt: Optional[str] = None

    # Studien-Felder
    study_participant: bool = False
    study_mode_active: bool = False
    experience_level: Optional[str] = None
    full_name: Optional[str] = None

    class Config:
        orm_mode = True


class StudyModeToggle(BaseModel):
    """
    Schema zum Aktivieren/Deaktivieren des Studienmodus.

    Wird verwendet, um den Studienmodus eines Benutzers umzuschalten.
    Im Studienmodus werden zusätzliche Metriken erfasst.

    Attributes:
        study_mode_active (bool): True = Studienmodus aktivieren, False = deaktivieren
    """
    study_mode_active: bool


class CustomPromptCreate(BaseModel):
    """
    Schema zum Erstellen eines benutzerdefinierten KI-Prompts.

    Der Custom Prompt wird als System-Anweisung an die KI gesendet
    und beeinflusst den Stil der generierten Befunde.

    Attributes:
        custom_prompt (str): Der vollständige System-Prompt-Text
    """
    custom_prompt: str


class CustomPromptUpdate(BaseModel):
    """
    Schema zum Aktualisieren eines benutzerdefinierten KI-Prompts.

    Attributes:
        custom_prompt (str): Der neue System-Prompt-Text
    """
    custom_prompt: str


class CustomPromptOut(BaseModel):
    """
    Schema für die Ausgabe des benutzerdefinierten KI-Prompts.

    Attributes:
        custom_prompt (str, optional): Der aktuelle System-Prompt des Benutzers

    Config:
        orm_mode: Ermöglicht direkte Konvertierung von SQLAlchemy-Objekten
    """
    custom_prompt: Optional[str] = None

    class Config:
        orm_mode = True
