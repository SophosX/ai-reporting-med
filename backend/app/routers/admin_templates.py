from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.template_model import UserTemplate
from ..models.user_model import User
from ..core.security import get_current_user_id
from ..core.config import settings
import re

router = APIRouter()

def slugify(text):
    """Convert a title to a safe template_id slug format."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

@router.post("/migrate-templates-global")
async def migrate_templates_global(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Admin function: Migrate current user's templates to all other users.
    Only accessible by administrators (ADMIN_USERNAMES in .env).
    """

    # Get current user
    current_user = db.query(User).filter(User.id == current_user_id).first()

    if not current_user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    # Administratoren werden ueber ADMIN_USERNAMES in der .env konfiguriert
    if current_user.username not in settings.admin_usernames:
        raise HTTPException(
            status_code=403,
            detail="Keine Berechtigung. Diese Funktion ist nur für autorisierte Administratoren verfügbar."
        )

    # Get all templates from current user
    source_templates = db.query(UserTemplate).filter(
        UserTemplate.user_id == current_user_id
    ).all()

    if not source_templates:
        raise HTTPException(
            status_code=400,
            detail="Sie haben keine Vorlagen zum Migrieren."
        )

    # Get all other users
    all_users = db.query(User).filter(User.id != current_user_id).all()

    if not all_users:
        raise HTTPException(
            status_code=400,
            detail="Keine anderen Benutzer zum Migrieren gefunden."
        )

    migrated_count = 0
    updated_count = 0

    try:
        for target_user in all_users:
            for source_template in source_templates:
                # Generate template_id for target user
                base_slug = slugify(source_template.title)
                new_template_id = f"user-{target_user.id}-{base_slug}"

                # Check if template already exists for this user
                existing_template = db.query(UserTemplate).filter(
                    UserTemplate.user_id == target_user.id,
                    UserTemplate.template_id == new_template_id
                ).first()

                if existing_template:
                    # Update existing template
                    existing_template.title = source_template.title
                    existing_template.text = source_template.text
                    existing_template.is_default_override = source_template.is_default_override
                    existing_template.default_template_id = source_template.default_template_id
                    updated_count += 1
                else:
                    # Create new template
                    new_template = UserTemplate(
                        user_id=target_user.id,
                        title=source_template.title,
                        template_id=new_template_id,
                        text=source_template.text,
                        is_default_override=source_template.is_default_override,
                        default_template_id=source_template.default_template_id
                    )
                    db.add(new_template)
                    migrated_count += 1

        db.commit()

        return {
            "message": f"Templates erfolgreich migriert",
            "source_templates_count": len(source_templates),
            "target_users_count": len(all_users),
            "templates_created": migrated_count,
            "templates_updated": updated_count,
            "total_operations": migrated_count + updated_count
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Migration: {str(e)}"
        )
