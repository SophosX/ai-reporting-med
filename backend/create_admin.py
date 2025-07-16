#!/usr/bin/env python3
"""
Script to create an admin user
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, get_db
from app.models.user_model import User
from app.core.security import get_password_hash

def create_admin_user():
    """Create an admin user"""
    db = Session(engine)
    
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if admin_user:
            print("Admin user already exists!")
            print(f"Username: {admin_user.username}")
            print(f"Email: {admin_user.email}")
            print(f"Full Name: {admin_user.full_name}")
            print(f"Study Participant: {admin_user.study_participant}")
            
            # Update password
            admin_user.password = get_password_hash("StudyAdmin2024!")
            db.commit()
            print("✅ Admin password updated to 'StudyAdmin2024!'")
        else:
            # Create new admin user
            admin_user = User(
                username="admin",
                email="admin@example.com",
                full_name="Administrator",
                password=get_password_hash("StudyAdmin2024!"),
                study_participant=False,
                study_mode_active=False,
                experience_level=None
            )
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            print("✅ Admin user created successfully!")
            print(f"Username: admin")
            print(f"Password: StudyAdmin2024!")
            print(f"Email: admin@example.com")
            print(f"User ID: {admin_user.id}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()