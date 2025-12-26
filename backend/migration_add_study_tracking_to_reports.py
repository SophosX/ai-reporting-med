"""
Migration: Add study tracking fields to reports table
Adds case_id and study_duration_seconds to reports for displaying study info in history

Date: 2025-12-26
"""

from sqlalchemy import create_engine, text, Column, String, Integer, inspect
from app.core.config import settings

def run_migration():
    """Add case_id and study_duration_seconds columns to reports table"""

    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('reports')]

        # Add case_id column if it doesn't exist
        if 'case_id' not in columns:
            print("Adding 'case_id' column to reports table...")
            conn.execute(text("""
                ALTER TABLE reports
                ADD COLUMN case_id VARCHAR(100) NULL
                COMMENT 'Case ID for matching AI vs manual reports in study'
            """))
            conn.commit()
            print("✓ Added case_id column")
        else:
            print("✓ case_id column already exists")

        # Add study_duration_seconds column if it doesn't exist
        if 'study_duration_seconds' not in columns:
            print("Adding 'study_duration_seconds' column to reports table...")
            conn.execute(text("""
                ALTER TABLE reports
                ADD COLUMN study_duration_seconds INT NULL
                COMMENT 'Total study session duration in seconds'
            """))
            conn.commit()
            print("✓ Added study_duration_seconds column")
        else:
            print("✓ study_duration_seconds column already exists")

        print("\n✅ Migration completed successfully!")
        print("\nNew columns added:")
        print("  - case_id: VARCHAR(100) - For matching AI vs manual reports")
        print("  - study_duration_seconds: INT - Total study session duration")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add study tracking fields to reports")
    print("=" * 60)
    run_migration()
