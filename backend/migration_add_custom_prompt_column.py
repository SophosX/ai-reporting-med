"""
Migration script to add custom_prompt column to users table
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    # Get database URL from environment variables
    database_url = os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("DATABASE_URL")
    if not database_url:
        print("SQLALCHEMY_DATABASE_URI or DATABASE_URL environment variable not found")
        return
    
    # Create engine
    engine = create_engine(database_url)
    
    # Check if column already exists
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'custom_prompt' in columns:
        print("custom_prompt column already exists, skipping migration")
        return
    
    # Add the custom_prompt column
    try:
        with engine.connect() as connection:
            connection.execute(text("""
                ALTER TABLE users ADD COLUMN custom_prompt TEXT;
            """))
            connection.commit()
            print("Successfully added custom_prompt column to users table")
    except Exception as e:
        print(f"Error adding custom_prompt column: {e}")
        raise

if __name__ == "__main__":
    run_migration() 