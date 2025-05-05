# Medical Report Assistant

A web application for generating and managing medical reports using AI.

## Features

- AI-powered medical report generation
- Report history management
- Edit and update reports
- PDF export of reports
- User authentication
- Template system

## Installation

### Backend

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create a virtual environment:

   ```
   python -m venv venv
   ```

3. Activate the virtual environment:

   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

5. Start the backend server:
   ```
   uvicorn app.main:app --reload
   ```

### Frontend

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## PDF Generation

The application supports exporting reports as PDF files. The generated PDFs include:

- Report header with ID and date
- Input text that was used to generate the report
- The formatted medical report content

PDF downloads can be initiated from the report view by clicking the PDF icon button.

## API Endpoints

- `POST /reports/` - Create a new report
- `GET /reports/` - Get all reports for the current user
- `GET /reports/{report_id}` - Get a specific report
- `DELETE /reports/{report_id}` - Delete a report
- `GET /reports/{report_id}/pdf` - Download a report as PDF

## Technologies

- Backend: FastAPI, SQLAlchemy, OpenAI API, ReportLab (PDF generation)
- Frontend: React, Tailwind CSS, React Router
- Database: MySQL
