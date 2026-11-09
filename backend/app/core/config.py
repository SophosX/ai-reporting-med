"""
Config - Zentrale Konfigurationsverwaltung für die Medical Report Assistant Anwendung.

Dieses Modul verwendet pydantic-settings um Umgebungsvariablen zu laden und zu validieren.
Die Konfiguration wird aus einer .env-Datei oder direkt aus Umgebungsvariablen gelesen.

Verwendung:
    from app.core.config import settings

    # Zugriff auf Konfigurationswerte
    print(settings.PROJECT_NAME)
    print(settings.AI_PROVIDER)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Zentrale Konfigurationsklasse für alle Anwendungseinstellungen.

    Diese Klasse definiert alle Konfigurationsoptionen der Anwendung.
    Werte werden aus Umgebungsvariablen oder der .env-Datei geladen.

    Anwendungseinstellungen:
        PROJECT_NAME (str): Name der Anwendung für Anzeige und Dokumentation

    Authentifizierungseinstellungen:
        SECRET_KEY (str): Geheimer Schlüssel für JWT-Token-Signierung
            - WICHTIG: In Produktion einen sicheren, zufälligen Wert verwenden!
        ALGORITHM (str): JWT-Signierungsalgorithmus (Standard: HS256)
        ACCESS_TOKEN_EXPIRE_MINUTES (int): Gültigkeitsdauer von Tokens in Minuten

    Datenbankeinstellungen:
        SQLALCHEMY_DATABASE_URI (str): Vollständige Datenbankverbindungs-URL
            - Format: mysql+pymysql://user:password@host:port/database

    KI-Service-Konfiguration:
        AI_PROVIDER (str): Auswahl des KI-Providers
            - "openai": OpenAI API direkt
            - "azure": Azure OpenAI Service
            - "uni": Universitäts-Proxy-API (GPT-5)

    OpenAI-Einstellungen (für AI_PROVIDER="openai"):
        OPENAI_API_KEY (str): API-Schlüssel für OpenAI
        OPENAI_MODEL (str): Zu verwendendes Modell (Standard: gpt-4o)

    Azure OpenAI-Einstellungen (für AI_PROVIDER="azure"):
        AZURE_OPENAI_API_KEY (str): API-Schlüssel für Azure OpenAI
        AZURE_OPENAI_ENDPOINT (str): Azure-Endpunkt-URL
        AZURE_OPENAI_MODEL (str): Deployment-Name des Modells
        AZURE_API_VERSION (str): Azure API-Version

    Universitäts-API-Einstellungen (für AI_PROVIDER="uni"):
        UNI_API_KEY (str): JWT-Token für die Uni-API
        UNI_API_ENDPOINT (str): Basis-URL der Uni-API
        UNI_API_MODEL (str): Modellname (Standard: gpt-5)

    CORS-Einstellungen:
        CORS_ORIGINS (str): Komma-getrennte Liste erlaubter Origins
            - Beispiel: "http://localhost:5173,https://example.com"
    """

    # Anwendungseinstellungen
    PROJECT_NAME: str = "Medical Reports"

    # Authentifizierungseinstellungen
    SECRET_KEY: str  # Pflichtfeld - muss in .env gesetzt werden
    ALGORITHM: str = "HS256"  # JWT-Signierungsalgorithmus
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 Stunden (8 * 60 Minuten)

    # Datenbankeinstellungen
    SQLALCHEMY_DATABASE_URI: str  # Pflichtfeld - MySQL-Verbindungsstring

    # KI-Service-Konfiguration - Auswahl des Providers
    AI_PROVIDER: str = "openai"  # Optionen: "openai", "azure", oder "uni"

    # OpenAI-Einstellungen (für Entwicklung/Testing)
    OPENAI_API_KEY: str  # Pflichtfeld
    OPENAI_MODEL: str = "gpt-4o"

    # Azure OpenAI-Einstellungen (für Produktion)
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_MODEL: str = "gpt-4o"
    AZURE_API_VERSION: str = "2025-01-01-preview"

    # Universitäts-API-Einstellungen (Custom Endpoint für Forschung)
    UNI_API_KEY: str = ""  # JWT-Token für Uni-API
    UNI_API_ENDPOINT: str = "https://api.truhn.ai"
    UNI_API_MODEL: str = "gpt-5"

    # CORS-Einstellungen für Cross-Origin-Anfragen
    CORS_ORIGINS: str = ""  # Komma-getrennt: "http://localhost:5173,https://example.com"

    # Umgebung: "development" oder "production".
    # In Produktion werden /docs, /redoc und /openapi.json abgeschaltet.
    ENVIRONMENT: str = "development"

    # Administratoren (Komma-getrennte Benutzernamen). Diese Benutzer dürfen
    # alle Studiendaten exportieren und Vorlagen global migrieren.
    ADMIN_USERNAMES: str = "admin,newmhayawi"

    @property
    def admin_usernames(self) -> set:
        """Administratoren als Menge von Benutzernamen (ohne Leerzeichen, ohne Leereinträge)."""
        return {u.strip() for u in self.ADMIN_USERNAMES.split(",") if u.strip()}

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    # Konfiguration für das Laden von Umgebungsvariablen
    model_config = SettingsConfigDict(
        env_file=".env",  # Pfad zur .env-Datei
        env_file_encoding="utf-8",  # Encoding der .env-Datei
        extra="ignore"  # Ignoriere unbekannte Umgebungsvariablen
    )


# Singleton-Instanz der Konfiguration - wird beim Import erstellt
settings = Settings()
