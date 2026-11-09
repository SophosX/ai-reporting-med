"""
Auth Router - Authentifizierungs-Endpoints für Benutzerregistrierung und Login.

Dieses Modul enthält alle API-Endpoints für die Benutzerauthentifizierung:
- POST /auth/register: Neue Benutzerregistrierung
- POST /auth/login: Benutzeranmeldung mit JWT-Token-Ausgabe

Besonderheiten:
- Unterstützt Studienteilnehmer mit speziellen Token
- Setzt automatisch einen Standard-KI-Prompt für neue Benutzer
- Ermöglicht Login sowohl mit Benutzername als auch E-Mail
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.user_model import User
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user_schemas import UserCreate, UserLogin, UserOut
from datetime import timedelta
from ..core.config import settings
from ..core.request_logging import _client_ip
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Registriert einen neuen Benutzer im System.

    Diese Funktion verarbeitet die Benutzerregistrierung mit folgenden Schritten:
    1. Prüft auf doppelte Benutzernamen und E-Mail-Adressen
    2. Validiert Studien-Token (falls angegeben)
    3. Hasht das Passwort mit BCrypt
    4. Erstellt den Benutzer mit Standard-KI-Prompt

    Args:
        user_data (UserCreate): Registrierungsdaten vom Client
        db (Session): Datenbank-Session

    Returns:
        UserOut: Die erstellten Benutzerdaten (ohne Passwort)

    Raises:
        HTTPException (400): Bei doppeltem Benutzernamen, E-Mail oder ungültigem Studien-Token

    Studienteilnahme:
        Wenn ein gültiger study_token angegeben wird, muss der Benutzer auch
        full_name und experience_level angeben. Gültige Tokens sind derzeit
        hardcoded (in Produktion sollten diese aus der Datenbank kommen).
    """
    # Prüfe ob Benutzername bereits existiert
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Benutzername existiert bereits. Bitte wählen Sie einen anderen Benutzernamen."
        )

    # Prüfe ob E-Mail bereits existiert
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail."
        )

    # Validiere Studien-Token falls angegeben
    study_participant = False
    if user_data.study_token:
        # Gültige Studien-Tokens (in Produktion: aus Datenbank laden)
        VALID_STUDY_TOKENS = ["RADEFF2024", "STUDYMED2024", "AIRAD2024"]

        if user_data.study_token not in VALID_STUDY_TOKENS:
            raise HTTPException(
                status_code=400,
                detail="Ungültiger Studien-Token. Bitte prüfen Sie Ihre Einladungs-E-Mail für den korrekten Token."
            )

        # Bei gültigem Token: Name und Erfahrungsstufe sind Pflicht
        if not user_data.full_name or not user_data.experience_level:
            raise HTTPException(
                status_code=400,
                detail="Vollständiger Name und Erfahrungsstufe sind für Studienteilnehmer erforderlich."
            )

        study_participant = True

    # Standard-KI-Prompt für alle neuen Benutzer
    # Dieser Prompt definiert das Verhalten der KI bei der Befundgenerierung
    DEFAULT_CUSTOM_PROMPT = """Du fungierst als Assistentin bzw. Assistent für Radiologinnen und Radiologen. Deine Aufgabe ist es, aus unstrukturierten, frei diktierten radiologischen Beobachtungen einen sprachlich korrekten, vollständig strukturierten Befund in deutscher Sprache zu erstellen. Bitte beachte die folgenden strikten Vorgaben:
Exklusive Nutzung des Eingabetextes: Basierend nur auf den inhaltlichen Informationen des diktierten Textes. Verzichte auf Ergänzungen, Vermutungen oder Spekulationen.
Umfassende Dokumentation aller pathologischen Befunde: Stelle sicher, dass sämtliche beschriebenen Auffälligkeiten in die entsprechenden Abschnitte des Befund-Templates übernommen werden. Fehlerhafte Grammatik oder umgangssprachliche Formulierungen dürfen das Verständnis nicht beeinträchtigen; extrahiere jedes pathologische Detail und strukturiere es korrekt.
Vollständige Bearbeitung des Templates: Jeder Abschnitt des vorgegebenen Befund-Templates ist auszufüllen. Wo keine Informationen im diktierten Text vorhanden sind, nutze die Standardformulierung aus dem Template für diesen Abschnitt (z. B. „unauffällig" oder „kein pathologischer Befund").
Festgelegte Abschnitts-Reihenfolge: Die Reihenfolge der Abschnitte im Template darf nicht verändert werden. Halte dich genau an die Struktur, auch wenn einzelne Abschnitte keine spezifischen Informationen erhalten.
Prägnanter Stil: Nutze den typischen, telegraphischen Stil radiologischer Befundung: kurz, sachlich und präzise, ohne narrative Ausschmückungen.

Wichtig: Achte besonders darauf, dass kein pathologischer Befund aus dem diktierten Text unter den Tisch fällt oder weggelassen wird, auch wenn der Text uneinheitlich oder grammatikalisch fehlerhaft ist. Jede relevante Beobachtung muss sich im finalen Bericht widerspiegeln."""

    # Passwort hashen und Benutzer erstellen
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_pw,
        full_name=user_data.full_name,
        study_participant=study_participant,
        study_token=user_data.study_token if study_participant else None,
        experience_level=user_data.experience_level.value if user_data.experience_level else None,
        custom_prompt=DEFAULT_CUSTOM_PROMPT  # Standard-Prompt für alle neuen Benutzer
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(
        "Registrierung: user_id=%s username=%s study_participant=%s",
        new_user.id, new_user.username, study_participant
    )

    # Benutzerinformationen ohne Token zurückgeben
    return new_user


@router.post("/login")
def login_user(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authentifiziert einen Benutzer und gibt einen JWT-Token zurück.

    Unterstützt Login sowohl mit Benutzername als auch mit E-Mail-Adresse.
    Der Identifier wird anhand des @-Zeichens als E-Mail oder Benutzername erkannt.

    Args:
        login_data (UserLogin): Login-Daten (identifier + password)
        db (Session): Datenbank-Session

    Returns:
        dict: JWT-Token und Benutzerinformationen
            - access_token: Der JWT-Token für API-Anfragen
            - token_type: "bearer"
            - user_id, username, email: Benutzeridentifikation
            - full_name: Vollständiger Name (falls vorhanden)
            - study_participant: True wenn Studienteilnehmer
            - experience_level: Erfahrungsstufe des Arztes
            - study_mode_active: True wenn Studienmodus aktiv

    Raises:
        HTTPException (401): Bei ungültigen Anmeldedaten
    """
    identifier = login_data.identifier
    client_ip = _client_ip(request)

    # Heuristik: Enthält der Identifier ein "@"? Dann als E-Mail behandeln
    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.username == identifier).first()

    # Passwort überprüfen
    if not user or not verify_password(login_data.password, user.password):
        logger.warning("Login fehlgeschlagen: identifier=%s ip=%s", identifier, client_ip)
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")

    logger.info("Login: user_id=%s username=%s ip=%s", user.id, user.username, client_ip)

    # JWT-Token erstellen
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    # Token und Benutzerinformationen zurückgeben
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "study_participant": user.study_participant,
        "experience_level": user.experience_level,
        "study_mode_active": user.study_mode_active
    }
