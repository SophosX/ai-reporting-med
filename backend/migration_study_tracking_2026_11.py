"""
Migration: Erweiterte Studien-Erfassung (2026-11-19)

- reports: study_session_id (FK), ai_generated_text, KI-Metadaten, edit_count, last_edited_at
- study_sessions: status, active_time_seconds, client_metrics, platform_version, post_edit_*
- neue Tabellen report_versions, study_events (über SQLAlchemy create_all)
- Backfill: status und active_time_seconds für Alt-Sessions, reports.study_session_id
  aus study_sessions.report_id

Idempotent: kann beliebig oft ausgeführt werden.
Aufruf: cd backend && venv/bin/python migration_study_tracking_2026_11.py
"""

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

REPORT_COLUMNS = [
    ("study_session_id", "INT NULL"),
    ("ai_generated_text", "TEXT NULL"),
    ("ai_provider", "VARCHAR(50) NULL"),
    ("ai_model", "VARCHAR(100) NULL"),
    ("system_prompt_used", "TEXT NULL"),
    ("generation_ms", "INT NULL"),
    ("ai_finish_reason", "VARCHAR(50) NULL"),
    ("ai_prompt_tokens", "INT NULL"),
    ("ai_completion_tokens", "INT NULL"),
    ("ai_reasoning_tokens", "INT NULL"),
    ("generation_error", "TINYINT(1) NULL"),
    ("edit_count", "INT NULL"),
    ("last_edited_at", "DATETIME NULL"),
]

SESSION_COLUMNS = [
    ("status", "VARCHAR(20) NULL"),
    ("active_time_seconds", "INT NULL"),
    ("client_metrics", "JSON NULL"),
    ("platform_version", "VARCHAR(40) NULL"),
    ("post_edit_count", "INT NULL"),
    ("post_edit_seconds", "INT NULL"),
    ("final_words_after_edit", "INT NULL"),
    ("last_edit_at", "DATETIME NULL"),
]


def _add_columns(conn, inspector, table, columns):
    existing = {c["name"] for c in inspector.get_columns(table)}
    for name, ddl in columns:
        if name in existing:
            print(f"  = {table}.{name} existiert")
            continue
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        print(f"  + {table}.{name}")


def run_migration():
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

    # Neue Tabellen (report_versions, study_events)
    from app.core.database import Base
    import app.models  # noqa: F401  (registriert alle Modelle)
    from app.models.study_tracking import ReportVersion, StudyEvent
    Base.metadata.create_all(bind=engine, tables=[ReportVersion.__table__, StudyEvent.__table__])
    print("Tabellen report_versions, study_events vorhanden")

    with engine.begin() as conn:
        inspector = inspect(conn)
        _add_columns(conn, inspector, "reports", REPORT_COLUMNS)
        _add_columns(conn, inspector, "study_sessions", SESSION_COLUMNS)

        fks = {fk["name"] for fk in inspect(conn).get_foreign_keys("reports")}
        if "fk_reports_study_session" not in fks:
            conn.execute(text(
                "ALTER TABLE reports ADD CONSTRAINT fk_reports_study_session "
                "FOREIGN KEY (study_session_id) REFERENCES study_sessions(id)"
            ))
            print("  + FK fk_reports_study_session")

        # Backfill (nur leere Felder)
        r = conn.execute(text(
            "UPDATE study_sessions SET status = IF(session_end IS NULL, 'started', 'completed') "
            "WHERE status IS NULL"
        ))
        print(f"  Backfill status: {r.rowcount}")
        r = conn.execute(text(
            "UPDATE study_sessions SET active_time_seconds = "
            "GREATEST(0, total_time_seconds - COALESCE(total_pause_seconds, 0)) "
            "WHERE active_time_seconds IS NULL AND total_time_seconds IS NOT NULL"
        ))
        print(f"  Backfill active_time_seconds: {r.rowcount}")
        r = conn.execute(text(
            "UPDATE reports r JOIN study_sessions s ON s.report_id = r.id "
            "SET r.study_session_id = s.id WHERE r.study_session_id IS NULL"
        ))
        print(f"  Backfill reports.study_session_id: {r.rowcount}")

    print("Migration abgeschlossen")


if __name__ == "__main__":
    run_migration()
