"""
Database - SQLAlchemy-Datenbankverbindung und Session-Management.

Dieses Modul konfiguriert die Datenbankverbindung und stellt die Session-Factory
sowie die Basis-Klasse für ORM-Modelle bereit.

Komponenten:
    - engine: SQLAlchemy Engine für die Datenbankverbindung
    - SessionLocal: Session-Factory für Datenbankoperationen
    - Base: Deklarative Basis für alle ORM-Modelle
    - get_db(): Dependency-Funktion für FastAPI-Endpoints

Verwendung in FastAPI-Endpoints:
    from app.core.database import get_db
    from sqlalchemy.orm import Session

    @app.get("/items")
    def get_items(db: Session = Depends(get_db)):
        # db kann hier für Datenbankoperationen verwendet werden
        return db.query(Item).all()
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# SQLAlchemy Engine - Verbindungspool zur Datenbank
# echo=False deaktiviert SQL-Logging in der Konsole
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)

# Session-Factory - erstellt neue Datenbank-Sessions
# autocommit=False: Transaktionen müssen explizit committed werden
# autoflush=False: Änderungen werden nicht automatisch zur DB gesendet
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Deklarative Basis - alle ORM-Modelle erben von dieser Klasse
Base = declarative_base()


def get_db():
    """
    Dependency-Funktion für FastAPI zur Bereitstellung von Datenbank-Sessions.

    Diese Generator-Funktion erstellt eine neue Datenbank-Session für jeden
    Request und schließt sie automatisch nach Abschluss des Requests.

    Yields:
        Session: Eine SQLAlchemy-Datenbank-Session

    Beispiel:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()

    Hinweis:
        Die Session wird im finally-Block geschlossen, auch wenn
        eine Exception auftritt. Dies verhindert Connection-Leaks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
