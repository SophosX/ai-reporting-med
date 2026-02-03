"""
Init DB - Datenbankinitialisierung mit Standarddaten.

Dieses Modul wird beim Start der Anwendung aufgerufen, um die Datenbank
mit erforderlichen Standarddaten zu initialisieren (z.B. Standard-Templates).

Die Initialisierung ist idempotent - bereits existierende Daten werden
nicht dupliziert.
"""

from sqlalchemy.orm import Session
from ..data.templates import import_default_templates
import logging

# Logger für Initialisierungsmeldungen
logger = logging.getLogger(__name__)


def init_db(db: Session):
    """
    Initialisiert die Datenbank mit Standarddaten.

    Diese Funktion wird beim Anwendungsstart aufgerufen und importiert
    alle erforderlichen Standarddaten in die Datenbank.

    Aktuell durchgeführte Initialisierungen:
        1. Import der Standard-Befund-Templates (CT, MRT, etc.)

    Args:
        db (Session): Eine aktive SQLAlchemy-Datenbank-Session

    Raises:
        Exception: Wird bei Fehlern während der Initialisierung weitergereicht

    Hinweis:
        Die Funktion ist idempotent - bei erneutem Aufruf werden bereits
        existierende Daten nicht dupliziert. Dies ermöglicht sicheres
        Neustarten der Anwendung ohne Datenverlust oder -duplizierung.

    Beispiel:
        # Wird typischerweise in main.py aufgerufen:
        @app.on_event("startup")
        def startup():
            db = SessionLocal()
            try:
                init_db(db)
            finally:
                db.close()
    """
    try:
        # Standard-Templates importieren (CT Thorax, MRT Kopf, etc.)
        import_default_templates(db)
        logger.info("Default templates imported successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
