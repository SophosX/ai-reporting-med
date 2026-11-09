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
   - `templates.py`: Standard template management (incl. per-user overrides, see "Template Editing Semantics")
   - `user_templates.py`: User-specific template management
   - `custom_prompt.py`: Custom prompt management
   - `study.py`: Study mode, study sessions (timer, metrics) and study data export
   - `admin_templates.py`: Admin-only migration of templates to all users

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
- Supports OpenAI, Azure OpenAI, and University API providers
- Provider selection via `AI_PROVIDER` environment variable (openai/azure/uni)
- Model configuration through environment variables
- University API uses GPT-5 with optimized `reasoning_effort="low"` for fast responses

### Database Migrations
- Custom migration scripts in backend root directory
- Migrations run automatically on app startup
- Handle schema updates for templates, overrides, and custom prompts

### Template Editing Semantics (since November 2026)
System templates belong to user ID 1. Editing them goes through `PUT /templates/{template_id}`:
- **Own template or own override**: updated in place.
- **System template, `apply_globally: false` (default)**: a personal override is created or
  updated (`template_id = user-{uid}-override-{system_id}`, `is_default_override = true`).
  The system template stays unchanged for everyone else. A hidden template (`[DELETED]` marker)
  becomes visible again as an override.
- **System template, `apply_globally: true`**: the system template itself is changed for ALL
  users. The frontend only sends this after the user ticks "Für alle Benutzer ändern (global)"
  and confirms a warning dialog. Every global change is logged with the user ID.
- **Another user's template**: 404.

`DELETE /templates/{id}` deletes an own template, removes an own override (also when called
with the system ID, which is what the frontend does for "reset"), or hides a system template
for this user via a `[DELETED]` marker override.

Never test by sending `PUT /templates/{system_id}` with `apply_globally: true` against
production unless you intend to change the template for everyone. The original texts of
the 17 system templates live in `app/data/templates.py`.

### Authorization
- All `/templates/*` endpoints require a valid JWT (no anonymous access).
- Admin-only endpoints (`GET /study/study-data/export-all`,
  `POST /admin/migrate-templates-global`) check the username against `ADMIN_USERNAMES`.
- In production (`ENVIRONMENT=production`) `/docs`, `/redoc` and `/openapi.json` are disabled.

## Environment Configuration

### Backend (.env)
```
SECRET_KEY=your-secret-key
SQLALCHEMY_DATABASE_URI=mysql+pymysql://user:pass@host/db
AI_PROVIDER=uni  # "openai", "azure", or "uni"

# OpenAI settings (if AI_PROVIDER=openai)
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o

# Azure settings (if AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_MODEL=gpt-4o

# University API settings (if AI_PROVIDER=uni)
UNI_API_KEY=your-jwt-token
UNI_API_ENDPOINT=https://api.truhn.ai
UNI_API_MODEL=gpt-5

CORS_ORIGINS=http://localhost:5173,https://your-production-domain.com

# "development" or "production" (production disables /docs, /redoc, /openapi.json)
ENVIRONMENT=development

# Comma-separated usernames with admin rights (study export-all, global template migration)
ADMIN_USERNAMES=admin,newmhayawi
```

### Frontend
API URL comes from `VITE_API_URL` in `frontend/.env` (production: `/api`, proxied by nginx
to the backend on port 8000), see `src/utils/apiConfig.js`.

## Production Deployment (report.alexanderfesl.com)

- Backend runs as Gunicorn (4 Uvicorn workers) on `127.0.0.1:8000`, started manually (no systemd unit).
- Frontend is served by nginx from `frontend/dist`; `/api/` is proxied to the backend.
- `backend/.env` is not in git. Keep `ENVIRONMENT=production` there.

```bash
# Backend code change: graceful reload (workers re-read code and .env, no downtime)
kill -HUP $(ps aux | grep "gunicorn.*ai_reporting.*8000" | grep -v grep | awk 'NR==1{print $2}')

# Frontend change: rebuild, nginx serves the new bundle immediately
cd frontend && npm run build

# Smoke test
curl -s https://report.alexanderfesl.com/api/health
```

## Important Notes

- The application uses MySQL as the database
- PDF generation is handled server-side using ReportLab
- Templates support markdown formatting with preview
- Word count analysis includes overall statistics and individual metrics
- The application supports both standard templates and user-created templates
- All users have a standardized custom prompt for consistent AI behavior
- Template encoding issues (UTF-8) have been fixed for German umlauts

## Recent Updates (November 2026)

Full end-to-end test of all API endpoints on 2026-11-09, followed by these fixes
(commits `a2bce5f`, `430eefd`):

1. **Template overwrite bug fixed** - `PUT /templates/{id}` had no user filter; editing a
   standard template in the UI silently overwrote it for all users. It now creates a personal
   override by default; global changes require `apply_globally: true` plus a confirmation
   dialog in `TemplatesPage.jsx`.
2. **Override reset fixed** - deleting an override via the system template ID now removes
   the override instead of reporting "already hidden".
3. **Save button after AI generation fixed** - `NewReportPage.jsx` now saves via
   `PUT /reports/{id}` (previously called a non-existent `/reports/latest/`).
4. **Hardening** - API docs disabled in production, `GET /templates/{id}` returns 404 for
   unknown IDs, template endpoints require login, admin usernames moved to `ADMIN_USERNAMES`.

Test accounts `claudetest1794218560` and `claudestudy1794218560` exist in the production
database for future end-to-end tests (intentionally kept).

## Recent Updates (August 2025)

### Major Changes Documentation
For detailed information about recent implementations, see: `/backend/CHANGELOG_2025_08_19.md`

Key updates include:
1. **Template Encoding Fix** - Corrected UTF-8 issues for German characters
2. **Custom Prompt Standardization** - All users now have consistent AI instructions
3. **University API Integration** - Added support for GPT-5 via university proxy
4. **Performance Optimizations** - Response times reduced to <5 seconds with `reasoning_effort="low"`

### Migration Scripts Available
- `migrate_fix_template_encoding.py` - Fixes template character encoding
- `migrate_custom_prompts_all_users.py` - Updates all user prompts
- `test_uni_api.py` - Tests University API connection
- `verify_template_encoding.py` - Verifies encoding fixes
- `verify_custom_prompts.py` - Verifies prompt updates

### Testing the University API
```bash
cd backend
source venv/bin/activate
python test_uni_api.py  # Test connection and basic functionality
python test_speed.py    # Test response times
```