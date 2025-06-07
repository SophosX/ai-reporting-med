"""
Migration script to add word count metrics columns and populate existing reports
"""
import os
import sys
from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.orm import sessionmaker
import logging

# Add the app directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.report_model import Report
from app.services.word_count_service import update_report_word_metrics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_word_counts():
    """Add word count columns to reports table and populate existing reports"""
    
    # Create engine and session
    database_url = settings.SQLALCHEMY_DATABASE_URI
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    metadata = MetaData()
    
    with engine.connect() as connection:
        logger.info("Starting word count migration...")
        
        # Check if columns already exist
        reports = Table('reports', metadata, autoload_with=engine)
        column_names = [column.name for column in reports.columns]
        
        logger.info(f"Current columns in reports table: {column_names}")
        
        # Add columns if they don't exist
        columns_to_add = [
            ('total_words', 'INTEGER DEFAULT 0'),
            ('generated_words', 'INTEGER DEFAULT 0'),
            ('saved_words', 'INTEGER DEFAULT 0')
        ]
        
        for column_name, column_type in columns_to_add:
            if column_name not in column_names:
                logger.info(f"Adding '{column_name}' column to reports table...")
                connection.execute(text(f"""
                    ALTER TABLE reports 
                    ADD COLUMN {column_name} {column_type}
                """))
                connection.commit()
                logger.info(f"'{column_name}' column added successfully")
            else:
                logger.info(f"'{column_name}' column already exists")
        
        # Now populate existing reports with word counts
        logger.info("Populating word count metrics for existing reports...")
        logger.info("Note: For existing reports, we calculate initial metrics.")
        logger.info("- total_words = current report length")
        logger.info("- generated_words = current report length (assuming fully AI-generated)")
        logger.info("- saved_words = 0 (no manual edits recorded)")
        
        # Create a new session for data operations
        session = SessionLocal()
        try:
            # Get all reports that don't have word counts calculated (where total_words is 0 or None)
            reports_to_update = session.query(Report).filter(
                (Report.total_words == 0) | (Report.total_words.is_(None))
            ).all()
            
            logger.info(f"Found {len(reports_to_update)} reports to update")
            
            for i, report in enumerate(reports_to_update, 1):
                try:
                    # For existing reports, assume they are fully AI-generated with no manual edits
                    from app.services.word_count_service import count_words
                    total_words = count_words(report.report_text)
                    
                    report.total_words = total_words
                    report.generated_words = total_words  # Assume fully AI-generated
                    report.saved_words = 0  # No manual edits recorded
                    
                    logger.info(f"Updated report {report.id}: "
                              f"total={report.total_words}, "
                              f"generated={report.generated_words}, "
                              f"saved={report.saved_words}")
                    
                    # Commit every 10 reports to avoid large transactions
                    if i % 10 == 0:
                        session.commit()
                        logger.info(f"Committed batch ending at report {i}")
                        
                except Exception as e:
                    logger.error(f"Error updating report {report.id}: {e}")
                    continue
            
            # Final commit
            session.commit()
            logger.info("All reports updated successfully!")
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            session.rollback()
            raise
        finally:
            session.close()
        
        # Verify the migration
        logger.info("Verifying migration...")
        metadata.clear()
        reports = Table('reports', metadata, autoload_with=engine)
        updated_column_names = [column.name for column in reports.columns]
        logger.info(f"Updated columns in reports table: {updated_column_names}")
        
        # Check if data was populated
        result = connection.execute(text("SELECT COUNT(*) as total, SUM(total_words) as total_words FROM reports")).fetchone()
        logger.info(f"Migration verification: {result.total} reports, {result.total_words} total words across all reports")
        
    logger.info("Word count migration completed successfully!")

if __name__ == "__main__":
    migrate_word_counts() 