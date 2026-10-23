import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.auth_routes import router as auth_router
from routes.google_calendar_routes import router as calendar_router
from routes.microsoft_calendar_routes import router as ms_calendar_router
from routes.ats_routes import router as ats_router
from routes.slack_routes import router as slack_router
from routes.panel_routes import router as panel_router
from routes.interview_routes import router as interview_router

load_dotenv()

app = FastAPI(
    title="Interview Panel Scheduler Backend API",
    description="Unified ATS & Multi-Calendar Interview Scheduling Engine with Google Calendar, Google Meet & Microsoft Graph",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(calendar_router)
app.include_router(ms_calendar_router)
app.include_router(ats_router)
app.include_router(slack_router)
app.include_router(panel_router)
app.include_router(interview_router)

@app.get("/")
def root():
    return {
        "service": "Interview Panel Scheduler API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "interview-panel-scheduler"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
