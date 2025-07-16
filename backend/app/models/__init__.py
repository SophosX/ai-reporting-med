# Import all models to ensure SQLAlchemy can resolve relationships
from .user_model import User
from .template_model import UserTemplate
from .report_model import Report
from .study_session import StudySession

# Make all models available when importing from models
__all__ = ["User", "UserTemplate", "Report", "StudySession"] 