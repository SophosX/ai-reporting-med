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
from app.services.word_count_service import count_words, calculate_word_metrics

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
            ('input_words', 'INTEGER DEFAULT 0'),
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
        logger.info("New calculation method:")
        logger.info("- input_words = user's initial input phrase")
        logger.info("- generated_words = AI-generated report (assumed to be current report for existing data)")
        logger.info("- total_words = final report text after any edits")
        logger.info("- saved_words = total_words - input_words (words user didn't have to type)")
        
        # Create a new session for data operations
        session = SessionLocal()
        try:
            # Get all reports that need word count updates
            reports_to_update = session.query(Report).filter(
                (Report.total_words == 0) | (Report.total_words.is_(None)) |
                (Report.input_words == 0) | (Report.input_words.is_(None))
            ).all()
            
            logger.info(f"Found {len(reports_to_update)} reports to update")
            
            for i, report in enumerate(reports_to_update, 1):
                try:
                    # Calculate word metrics using the new method
                    # For existing reports, assume current report_text is the AI-generated content
                    input_words, ai_generated_words, final_report_words, saved_words = calculate_word_metrics(
                        report.input_text,
                        report.report_text,  # Assume this is the AI-generated text for existing reports
                        report.report_text   # Final text is the same for existing reports (no edits recorded)
                    )
                    
                    # Update all word metrics
                    report.input_words = input_words
                    report.total_words = final_report_words
                    report.generated_words = ai_generated_words
                    report.saved_words = saved_words
                    
                    logger.info(f"Updated report {report.id}: "
                              f"input={report.input_words}, "
                              f"generated={report.generated_words}, "
                              f"total={report.total_words}, "
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
            
            # Display some example calculations for verification
            logger.info("\nExample calculations for verification:")
            sample_reports = session.query(Report).limit(3).all()
            for report in sample_reports:
                efficiency = round((report.saved_words / max(1, report.input_words)) * 100)
                edit_delta = report.total_words - report.generated_words
                saved_initial = max(0, report.generated_words - report.input_words)
                
                logger.info(f"Report {report.id}:")
                logger.info(f"  Input: '{report.input_text[:50]}...' ({report.input_words} words)")
                logger.info(f"  AI Generated: {report.generated_words} words")
                logger.info(f"  Final Report: {report.total_words} words")
                logger.info(f"  Saved Words: {report.saved_words} ({efficiency}% efficiency)")
                logger.info(f"  Edit Delta: {edit_delta} words")
                logger.info(f"  Initial Savings: {saved_initial} words (AI - Input)")
                logger.info("")
            
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
        
        # Check aggregated statistics
        result = connection.execute(text("""
            SELECT 
                COUNT(*) as total_reports,
                SUM(input_words) as total_input_words,
                SUM(generated_words) as total_generated_words,
                SUM(total_words) as total_final_words,
                SUM(saved_words) as total_saved_words,
                ROUND(AVG(input_words)) as avg_input_words,
                ROUND(AVG(saved_words)) as avg_saved_words
            FROM reports
        """)).fetchone()
        
        logger.info(f"Migration verification:")
        logger.info(f"  Total Reports: {result.total_reports}")
        logger.info(f"  Total Input Words: {result.total_input_words}")
        logger.info(f"  Total AI Generated Words: {result.total_generated_words}")
        logger.info(f"  Total Final Words: {result.total_final_words}")
        logger.info(f"  Total Saved Words: {result.total_saved_words}")
        logger.info(f"  Average Input Words: {result.avg_input_words}")
        logger.info(f"  Average Saved Words: {result.avg_saved_words}")
        
        if result.total_input_words > 0:
            efficiency_rate = round((result.total_saved_words / result.total_input_words) * 100, 1)
            logger.info(f"  Overall Efficiency Rate: {efficiency_rate}%")
        
    logger.info("Word count migration completed successfully!")

if __name__ == "__main__":
    migrate_word_counts() 