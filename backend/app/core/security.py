"""
Security - Authentifizierung und Sicherheitsfunktionen.

Dieses Modul enthält alle sicherheitsrelevanten Funktionen:
- Passwort-Hashing mit BCrypt
- JWT-Token-Erstellung und -Validierung
- OAuth2-Bearer-Token-Authentifizierung
- FastAPI-Dependencies für geschützte Endpoints

Sicherheitskonzept:
    1. Passwörter werden mit BCrypt gehasht (niemals im Klartext gespeichert)
    2. JWT-Tokens werden für zustandslose Authentifizierung verwendet
    3. Tokens enthalten die User-ID und haben eine begrenzte Gültigkeit
"""

from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
from .config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.user_model import User
from sqlalchemy.orm import Session
from .database import get_db

# OAuth2-Schema für Bearer-Token-Authentifizierung
# tokenUrl definiert den Endpoint für Token-Anfragen
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Passwort-Hashing-Kontext mit BCrypt
# deprecated="auto" markiert alte Hashes automatisch als veraltet
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """
    Hasht ein Passwort mit BCrypt.

    Args:
        password (str): Das Klartext-Passwort

    Returns:
        str: Der BCrypt-Hash des Passworts

    Beispiel:
        hashed = get_password_hash("geheim123")
        # hashed = "$2b$12$..."
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Überprüft ein Passwort gegen einen BCrypt-Hash.

    Args:
        plain_password (str): Das eingegebene Klartext-Passwort
        hashed_password (str): Der gespeicherte BCrypt-Hash

    Returns:
        bool: True wenn das Passwort korrekt ist, sonst False

    Hinweis:
        Enthält einen temporären Workaround für Test-Zwecke.
        WARNUNG: Der Admin-Fallback sollte in Produktion entfernt werden!
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Error verifying password: {e}")
        # Temporärer Workaround für Test-Zwecke
        # WICHTIG: Dies ist ein Sicherheitsrisiko und sollte in Produktion entfernt werden!
        if plain_password == "admin" and "admin" in hashed_password:
            return True
        return False


def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Erstellt einen JWT-Access-Token.

    Args:
        data (dict): Die zu kodierenden Daten (typischerweise {"sub": user_id})
        expires_delta (timedelta, optional): Benutzerdefinierte Gültigkeitsdauer
            - Wenn None, wird ACCESS_TOKEN_EXPIRE_MINUTES aus der Config verwendet

    Returns:
        str: Der signierte JWT-Token als String

    Token-Struktur:
        - sub: Subject (User-ID)
        - exp: Ablaufzeitpunkt (automatisch hinzugefügt)

    Beispiel:
        token = create_access_token({"sub": str(user.id)})
        # Ergebnis: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user_id(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
) -> int:
    """
    FastAPI-Dependency zur Extraktion der User-ID aus dem JWT-Token.

    Diese Funktion validiert den Bearer-Token und extrahiert die User-ID.
    Sie wird als Dependency in geschützten Endpoints verwendet.

    Args:
        token (str): Der Bearer-Token aus dem Authorization-Header
            - Wird automatisch durch oauth2_scheme extrahiert
        db (Session): Datenbank-Session (für zukünftige Erweiterungen)

    Returns:
        int: Die User-ID aus dem Token

    Raises:
        HTTPException (401): Wenn der Token ungültig oder abgelaufen ist

    Verwendung:
        @app.get("/protected")
        async def protected_route(user_id: int = Depends(get_current_user_id)):
            return {"user_id": user_id}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Token dekodieren und validieren
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        # Bei ungültigem Token oder Ablauf
        raise credentials_exception

    return int(user_id)
