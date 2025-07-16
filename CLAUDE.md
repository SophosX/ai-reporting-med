# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Medical Report Assistant web application that enables AI-powered medical report generation and management. The application consists of:
- **Backend**: FastAPI-based REST API with MySQL database
- **Frontend**: React with Vite, Tailwind CSS, and React Router

## Development Commands

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
# or
python run.py

# Run linting (if ruff is installed)
ruff check .
ruff format .
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Backend Architecture

The backend follows a layered architecture pattern:

1. **API Layer** (`app/routers/`):
   - `auth.py`: JWT-based authentication endpoints
   - `reports.py`: Report generation and management
   - `templates.py`: Standard template management
   - `user_templates.py`: User-specific template management
   - `custom_prompt.py`: Custom prompt management

2. **Service Layer** (`app/services/`):
   - `openai_service.py`: AI provider abstraction (supports OpenAI and Azure OpenAI)
   - `pdf_service.py`: PDF generation using ReportLab
   - `word_count_service.py`: Word count analysis

3. **Data Layer**:
   - **Models** (`app/models/`): SQLAlchemy ORM models for User, Report, and UserTemplate
   - **Schemas** (`app/schemas/`): Pydantic models for request/response validation
   - **Database** (`app/core/database.py`): Database connection and session management

4. **Core Components** (`app/core/`):
   - `config.py`: Settings management using pydantic-settings
   - `security.py`: Password hashing and JWT token handling
   - `init_db.py`: Database initialization with default data

### Frontend Architecture

The frontend is a Single Page Application (SPA) with:

1. **Pages** (`src/pages/`):
   - Authentication: `LoginPage.jsx`, `RegisterPage.jsx`
   - Report Management: `CreateReportPage.jsx`, `NewReportPage.jsx`, `ReportDetailPage.jsx`, `ReportsHistoryPage.jsx`
   - Template Management: `TemplatesPage.jsx`
   - Dashboard: `HomePage.jsx`

2. **Components** (`src/components/`):
   - `Navbar.jsx`: Navigation with authentication state
   - `ReportCard.jsx`: Report display component
   - `ProtectedRoute.jsx`: Route authentication guard
   - Statistics: `ReportsChart.jsx`, `WordCountMetrics.jsx`, `OverallWordCountStats.jsx`

3. **Context** (`src/context/`):
   - `TemplateContext.jsx`: Global template state management

4. **Utilities** (`src/utils/`):
   - `auth.js`: Authentication helpers and token management
   - `apiConfig.js`: API base URL configuration
   - `templateService.js`: Template API client
   - `wordCount.js`: Word count calculations

## Key Development Patterns

### API Integration
- The frontend uses environment-based API URL configuration
- All API calls include JWT authentication headers
- CORS is configured to support local development and production domains

### Authentication Flow
- JWT tokens stored in localStorage
- Token expiration set to 8 hours
- Protected routes redirect to login when unauthenticated

### AI Service Configuration
- Supports both OpenAI and Azure OpenAI providers
- Provider selection via `AI_PROVIDER` environment variable
- Model configuration through environment variables

### Database Migrations
- Custom migration scripts in backend root directory
- Migrations run automatically on app startup
- Handle schema updates for templates, overrides, and custom prompts

## Environment Configuration

### Backend (.env)
```
SECRET_KEY=your-secret-key
SQLALCHEMY_DATABASE_URI=mysql+pymysql://user:pass@host/db
AI_PROVIDER=openai  # or "azure"
OPENAI_API_KEY=your-key
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=your-endpoint
CORS_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

### Frontend
API URL configured in `src/utils/apiConfig.js` based on window.location

## Important Notes

- The application uses MySQL as the database
- PDF generation is handled server-side using ReportLab
- Templates support markdown formatting with preview
- Word count analysis includes overall statistics and individual metrics
- The application supports both standard templates and user-created templates