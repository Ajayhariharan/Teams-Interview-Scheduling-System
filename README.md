# SUG - Smart Unified Gathering (Interview Panel Scheduler & ATS AI)

An enterprise multi-calendar interview scheduling platform and ATS AI engine supporting **Google Calendar & Meet**, **Microsoft 365 / Outlook & Teams**, and **Slack Block Kit** notifications with a deterministic multi-panel availability solver.

---

## 📚 Documentation Index

- **[Developer Handover Guide (Comprehensive)](docs/DEVELOPER_HANDOVER.md)**: Full production manual covering architecture, API endpoints, database schemas, local setup, test execution, troubleshooting, and extension guidelines.
- **[Technical Architecture & Engineering Specs](docs/ARCHITECTURE.md)**: Interval mathematics, state machine, ATS parser architecture, and design system specifications.

---

## ⚡ Key Capabilities

- **Deterministic Multi-Panel Availability**: Solves multi-interviewer schedule intersections and working-hour constraints in client-side $O(N \log N)$ time.
- **ATS Resume AI Extraction**: Parses **PDF**, **DOCX**, and **TXT** files using PyMuPDF and **Gemini 2.5 Flash** for candidate profiling, skill parsing, and ATS match scoring.
- **Conversational AI Question Bank**: Generates 10 concise, direct 1–2 sentence interview questions with practical follow-up probes across 4 core competencies.
- **Automated Video Conferencing**: Creates **Google Meet** or **Microsoft Teams** meetings with direct join links and candidate agendas.
- **Slack Workspace Notifications**: Formats and dispatches interactive Block Kit announcements and interview reminders.
- **Dual Design System**: Switch seamlessly between **Modern Clean** and high-contrast **Neo-Brutalism** in both **Dark** and **Light** modes.

---

## 📁 Project Structure

```
SUG/
├── docs/                         # Production Documentation & Developer Handover
│   ├── DEVELOPER_HANDOVER.md     # Complete Handover Guide
│   └── ARCHITECTURE.md           # Engineering & Math Specs
├── backend/                      # Python FastAPI Backend (Port 8000)
│   ├── main.py                   # FastAPI Application Entrypoint & CORS
│   ├── scheduler.db              # SQLite Database (Panels, Candidates, Interviews)
│   ├── oauth/                    # Google, Microsoft Azure AD, Slack OAuth 2.0
│   ├── routes/                   # REST API Endpoints (/auth, /api/ats, /api/interviews, etc.)
│   ├── services/                 # DB, ATS AI, Google/Microsoft Calendar & Slack Services
│   ├── requirements.txt          # Python Dependencies
│   └── .env.example              # Environment Configuration Template
└── frontend/                     # React 19 + TypeScript + Vite (Port 5173)
    ├── src/
    │   ├── components/           # UI Components (Wizard, Timeline, Candidates, Panels)
    │   ├── services/             # API & LocalStorage Master Services
    │   ├── utils/                # Availability Engine & Question Generator
    │   ├── context/              # Theme & Design Mode Context Provider
    │   ├── types/                # TypeScript Type Definitions
    │   └── App.tsx               # Root App Orchestration & Auth State
    ├── package.json              # Node Dependencies & Scripts
    └── vite.config.ts            # Vite Build Configuration
```

---

## 🚀 Quick Start Guide

### 1. Start the Backend API (Port 8000)
```bash
cd backend
python -m venv venv

# Windows (PowerShell):
venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*API running at [http://localhost:8000](http://localhost:8000) (Interactive Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs))*

### 2. Start the Frontend Application (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
*Frontend running at [http://localhost:5173](http://localhost:5173)*

### 3. Run Automated Tests
```bash
cd frontend
npx vitest run
```

---

## 🔒 Security & Environment Variables

All API keys, secrets, and OAuth client credentials must be placed inside `backend/.env`. Never commit secrets to version control. Refer to `backend/.env.example` for all configurable variables.

