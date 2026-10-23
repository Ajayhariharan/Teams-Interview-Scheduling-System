"""
Database Service for SUG Panel Scheduler.

Manages SQLite storage for:
- `panel_members`: Provider-scoped interviewers, working hours, and synced calendar events.
- `candidates`: Candidate profiles, ATS extraction scores, resume texts, and generated AI questions.
- `interviews`: Scheduled bookings, attendee rosters, delivery modes, and meeting links.
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scheduler.db")

def get_db_connection() -> sqlite3.Connection:
    """
    Creates and returns a connection to the local SQLite database.
    Sets row_factory to sqlite3.Row for dictionary-like column access.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

DEFAULT_CANDIDATES = [
    {
        "id": "cand-1",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1 (555) 234-5678",
        "position": "Software Developer",
        "department": "Web Platforms",
        "experienceYears": 4,
        "currentStage": "Technical Round 1",
        "skills": ["React", "TypeScript", "Node.js", "GraphQL", "Tailwind CSS"],
        "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        "appliedDate": "2026-09-10",
        "atsScore": 92.4,
    },
    {
        "id": "cand-2",
        "name": "Emily Watson",
        "email": "emily.watson@example.com",
        "phone": "+1 (555) 345-6789",
        "position": "Staff Backend Engineer",
        "department": "Core Infrastructure",
        "experienceYears": 8,
        "currentStage": "System Design",
        "skills": ["Go", "Kafka", "PostgreSQL", "Distributed Systems", "gRPC"],
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        "appliedDate": "2026-09-08",
        "atsScore": 96.8,
    },
]

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='panel_members'")
    table_exists = cursor.fetchone()
    
    if table_exists:
        cursor.execute("PRAGMA table_info(panel_members)")
        columns = [col["name"] for col in cursor.fetchall()]
        if "provider" not in columns:
            cursor.execute("ALTER TABLE panel_members ADD COLUMN provider TEXT DEFAULT 'google'")
            conn.commit()
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS panel_members (
                id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'google',
                role TEXT NOT NULL,
                department TEXT,
                avatar TEXT,
                skills TEXT,
                timezone TEXT,
                working_hours TEXT,
                events_by_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, provider)
            )
        """)
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_panel_email_prov ON panel_members(email, provider)")
        conn.commit()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            position TEXT NOT NULL,
            department TEXT,
            experience_years REAL,
            current_stage TEXT,
            skills TEXT,
            avatar TEXT,
            applied_date TEXT,
            ats_score REAL,
            resume_filename TEXT,
            resume_text TEXT,
            summary TEXT,
            extracted_data TEXT,
            generated_questions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Check and add columns if they don't exist
    cursor.execute("PRAGMA table_info(candidates)")
    c_cols = [c["name"] for c in cursor.fetchall()]
    for col_name in ["resume_filename", "resume_text", "summary", "extracted_data", "generated_questions"]:
        if col_name not in c_cols:
            try:
                cursor.execute(f"ALTER TABLE candidates ADD COLUMN {col_name} TEXT")
            except Exception:
                pass
    conn.commit()


    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id TEXT PRIMARY KEY,
            candidate_id TEXT,
            candidate_name TEXT,
            candidate_email TEXT,
            candidate_role TEXT,
            candidate_ats_score REAL,
            interview_type TEXT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            duration_minutes INTEGER,
            delivery_mode TEXT,
            meet_url TEXT,
            location TEXT,
            building_floor TEXT,
            panel_members TEXT,
            external_event_id TEXT,
            provider TEXT DEFAULT 'google',
            status TEXT DEFAULT 'scheduled',
            agenda TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("PRAGMA table_info(interviews)")
    inv_cols = [c["name"] for c in cursor.fetchall()]
    if "provider" not in inv_cols:
        try:
            cursor.execute("ALTER TABLE interviews ADD COLUMN provider TEXT DEFAULT 'google'")
        except Exception:
            pass
    if "external_event_id" not in inv_cols:
        try:
            cursor.execute("ALTER TABLE interviews ADD COLUMN external_event_id TEXT")
        except Exception:
            pass
    conn.commit()

    # Seed candidates if empty
    cursor.execute("SELECT COUNT(*) as count FROM candidates")
    if cursor.fetchone()["count"] == 0:
        for c in DEFAULT_CANDIDATES:
            cursor.execute("""
                INSERT INTO candidates (id, name, email, phone, position, department, experience_years, current_stage, skills, avatar, applied_date, ats_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c["id"],
                c["name"],
                c["email"],
                c["phone"],
                c["position"],
                c["department"],
                c["experienceYears"],
                c["currentStage"],
                json.dumps(c["skills"]),
                c["avatar"],
                c["appliedDate"],
                c["atsScore"],
            ))
        conn.commit()
    else:
        # Prune legacy mock candidates 3, 4, 5
        cursor.execute("DELETE FROM candidates WHERE id IN ('cand-3', 'cand-4', 'cand-5')")
        cursor.execute("DELETE FROM interviews WHERE candidate_id IN ('cand-3', 'cand-4', 'cand-5')")
        conn.commit()

    conn.close()

# Initialize DB on module load
init_db()

# -------------------------------------------------------------
# Panel Members DB Functions
# -------------------------------------------------------------
def serialize_panel_row(row: sqlite3.Row) -> Dict[str, Any]:
    skills = []
    if row["skills"]:
        try:
            skills = json.loads(row["skills"])
        except Exception:
            skills = [s.strip() for s in row["skills"].split(",") if s.strip()]

    working_hours = {"start": "09:00", "end": "18:00"}
    if row["working_hours"]:
        try:
            working_hours = json.loads(row["working_hours"])
        except Exception:
            pass

    events_by_date = {}
    if row["events_by_date"]:
        try:
            events_by_date = json.loads(row["events_by_date"])
        except Exception:
            pass

    name = row["name"]
    initial = (name or row["email"] or "U").strip()[:1].upper()
    provider = row["provider"] if "provider" in row.keys() and row["provider"] else "google"

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "provider": provider,
        "role": row["role"],
        "department": row["department"] or "",
        "avatar": row["avatar"] or f"https://ui-avatars.com/api/?name={initial}&background=10b981&color=fff&size=256&bold=true",
        "skills": skills,
        "timezone": row["timezone"] or "UTC+05:30 (IST)",
        "workingHours": working_hours,
        "eventsByDate": events_by_date,
    }

def get_all_panel_members(provider: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if provider:
        cursor.execute("SELECT * FROM panel_members WHERE LOWER(provider) = LOWER(?) ORDER BY created_at ASC", (provider.strip(),))
    else:
        cursor.execute("SELECT * FROM panel_members ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    return [serialize_panel_row(r) for r in rows]

def get_panel_member_by_id(member_id: str, provider: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if provider:
        cursor.execute(
            "SELECT * FROM panel_members WHERE (id = ? OR LOWER(email) = LOWER(?)) AND LOWER(provider) = LOWER(?)",
            (member_id, member_id, provider.strip())
        )
    else:
        cursor.execute("SELECT * FROM panel_members WHERE id = ? OR LOWER(email) = LOWER(?)", (member_id, member_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return serialize_panel_row(row)
    return None

def upsert_panel_member(member: Dict[str, Any], provider: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    prov = (provider or member.get("provider") or "google").strip().lower()
    member_id = member.get("id") or member.get("email")
    name = member.get("name") or member.get("email", "Panelist").split("@")[0]
    email = member.get("email", "").strip().lower()
    role = member.get("role") or "Technical Interviewer"
    department = member.get("department") or ""
    initial = (name or email or "U").strip()[:1].upper()
    bg = "0078d4" if prov == "microsoft" else ("4a154b" if prov == "slack" else "10b981")
    avatar = member.get("avatar") or f"https://ui-avatars.com/api/?name={initial}&background={bg}&color=fff&size=256&bold=true"
    skills = json.dumps(member.get("skills", ["Live Calendar Availability", "Technical Interviews"]))
    working_hours = json.dumps(member.get("workingHours", {"start": "09:00", "end": "18:00"}))
    events_by_date = json.dumps(member.get("eventsByDate", {}))

    # Delete any existing record for this (email, provider) or (id, provider) before inserting
    cursor.execute("DELETE FROM panel_members WHERE (id = ? OR LOWER(email) = LOWER(?)) AND LOWER(provider) = LOWER(?)", (member_id, email, prov))
    
    cursor.execute("""
        INSERT INTO panel_members (id, name, email, provider, role, department, avatar, skills, timezone, working_hours, events_by_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (
        member_id,
        name,
        email,
        prov,
        role,
        department,
        avatar,
        skills,
        member.get("timezone", "UTC+05:30 (IST)"),
        working_hours,
        events_by_date,
    ))

    conn.commit()
    conn.close()
    return get_panel_member_by_id(member_id, prov) or member

def save_all_panel_members(members: List[Dict[str, Any]], provider: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    for member in members:
        prov = (provider or member.get("provider") or "google").strip().lower()
        member_id = member.get("id") or member.get("email")
        name = member.get("name") or member.get("email", "Panelist").split("@")[0]
        email = member.get("email", "").strip().lower()
        if not email or not member_id:
            continue
        role = member.get("role") or "Technical Interviewer"
        department = member.get("department") or ""
        initial = (name or email or "U").strip()[:1].upper()
        bg = "0078d4" if prov == "microsoft" else ("4a154b" if prov == "slack" else "10b981")
        avatar = member.get("avatar") or f"https://ui-avatars.com/api/?name={initial}&background={bg}&color=fff&size=256&bold=true"
        skills = json.dumps(member.get("skills", ["Live Calendar Availability", "Technical Interviews"]))
        working_hours = json.dumps(member.get("workingHours", {"start": "09:00", "end": "18:00"}))
        events_by_date = json.dumps(member.get("eventsByDate", {}))

        cursor.execute("DELETE FROM panel_members WHERE (id = ? OR LOWER(email) = LOWER(?)) AND LOWER(provider) = LOWER(?)", (member_id, email, prov))
        cursor.execute("""
            INSERT INTO panel_members (id, name, email, provider, role, department, avatar, skills, timezone, working_hours, events_by_date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            member_id,
            name,
            email,
            prov,
            role,
            department,
            avatar,
            skills,
            member.get("timezone", "UTC+05:30 (IST)"),
            working_hours,
            events_by_date,
        ))

    conn.commit()
    conn.close()
    return get_all_panel_members(provider)

def delete_panel_member(member_id: str, provider: Optional[str] = None) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    if provider:
        cursor.execute(
            "DELETE FROM panel_members WHERE (id = ? OR LOWER(email) = LOWER(?)) AND LOWER(provider) = LOWER(?)",
            (member_id, member_id, provider.strip())
        )
    else:
        cursor.execute("DELETE FROM panel_members WHERE id = ? OR LOWER(email) = LOWER(?)", (member_id, member_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------------------------------------------------
# Candidates DB Functions
# -------------------------------------------------------------
def serialize_candidate_row(row: sqlite3.Row) -> Dict[str, Any]:
    skills = []
    if row["skills"]:
        try:
            skills = json.loads(row["skills"])
        except Exception:
            skills = [s.strip() for s in row["skills"].split(",") if s.strip()]

    extracted_data = {}
    if "extracted_data" in row.keys() and row["extracted_data"]:
        try:
            extracted_data = json.loads(row["extracted_data"])
        except Exception:
            pass

    generated_questions = []
    if "generated_questions" in row.keys() and row["generated_questions"]:
        try:
            generated_questions = json.loads(row["generated_questions"])
        except Exception:
            pass

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"] or "",
        "position": row["position"],
        "department": row["department"] or "General Engineering",
        "experienceYears": row["experience_years"] or 0,
        "currentStage": row["current_stage"] or "Screening",
        "skills": skills,
        "avatar": row["avatar"] or f"https://ui-avatars.com/api/?name={row['name']}&background=6366f1&color=fff",
        "appliedDate": row["applied_date"] or "2026-09-01",
        "atsScore": row["ats_score"] or 90.0,
        "resumeFileName": row["resume_filename"] if "resume_filename" in row.keys() else None,
        "resumeText": row["resume_text"] if "resume_text" in row.keys() else None,
        "summary": row["summary"] if "summary" in row.keys() else None,
        "experienceRecords": extracted_data.get("experience_records", []),
        "projectRecords": extracted_data.get("project_records", []),
        "educationRecords": extracted_data.get("education_records", []),
        "certifications": extracted_data.get("certifications", []),
        "achievements": extracted_data.get("achievements", []),
        "outliers": extracted_data.get("outliers", []),
        "generatedQuestions": generated_questions,
    }

def get_all_candidates() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    return [serialize_candidate_row(r) for r in rows]

def get_candidate_by_id(candidate_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE id = ? OR LOWER(email) = LOWER(?)", (candidate_id, candidate_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return serialize_candidate_row(row)
    return None

def upsert_candidate(cand: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cand_id = cand.get("id") or f"cand-{int(os.times().system * 1000)}"
    skills_json = json.dumps(cand.get("skills", []))
    
    extracted_data = {
        "experience_records": cand.get("experienceRecords") or cand.get("experience_records") or [],
        "project_records": cand.get("projectRecords") or cand.get("project_records") or [],
        "education_records": cand.get("educationRecords") or cand.get("education_records") or [],
        "certifications": cand.get("certifications") or [],
        "achievements": cand.get("achievements") or [],
        "outliers": cand.get("outliers") or []
    }
    extracted_data_json = json.dumps(extracted_data)
    generated_questions_json = json.dumps(cand.get("generatedQuestions") or cand.get("generated_questions") or [])
    
    cursor.execute("""
        INSERT INTO candidates (
            id, name, email, phone, position, department, experience_years, current_stage, skills, avatar,
            applied_date, ats_score, resume_filename, resume_text, summary, extracted_data, generated_questions
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            phone = excluded.phone,
            position = excluded.position,
            department = excluded.department,
            experience_years = excluded.experience_years,
            current_stage = excluded.current_stage,
            skills = excluded.skills,
            avatar = excluded.avatar,
            applied_date = excluded.applied_date,
            ats_score = excluded.ats_score,
            resume_filename = excluded.resume_filename,
            resume_text = excluded.resume_text,
            summary = excluded.summary,
            extracted_data = excluded.extracted_data,
            generated_questions = excluded.generated_questions
    """, (
        cand_id,
        cand.get("name", "Candidate"),
        cand.get("email", ""),
        cand.get("phone", ""),
        cand.get("position", "Engineer"),
        cand.get("department", "Engineering"),
        cand.get("experienceYears", cand.get("experience_years", 3.0)),
        cand.get("currentStage", cand.get("current_stage", "Screening")),
        skills_json,
        cand.get("avatar", ""),
        cand.get("appliedDate", cand.get("applied_date", "2026-09-20")),
        cand.get("atsScore", cand.get("ats_score", 90.0)),
        cand.get("resumeFileName", cand.get("resume_filename", "")),
        cand.get("resumeText", cand.get("resume_text", "")),
        cand.get("summary", ""),
        extracted_data_json,
        generated_questions_json,
    ))
    conn.commit()
    conn.close()
    return get_candidate_by_id(cand_id) or cand

def update_candidate_stage_in_db(candidate_id: str, new_stage: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE candidates SET current_stage = ? WHERE id = ?", (new_stage, candidate_id))
    conn.commit()
    cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return serialize_candidate_row(row)
    return None

def update_candidate_questions_in_db(candidate_id: str, questions: List[Dict[str, Any]]) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE candidates SET generated_questions = ? WHERE id = ?", (json.dumps(questions), candidate_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def delete_candidate_in_db(candidate_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM candidates WHERE id = ? OR LOWER(email) = LOWER(?)", (candidate_id, candidate_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


# -------------------------------------------------------------
# Scheduled Interviews DB Functions
# -------------------------------------------------------------
def serialize_interview_row(row: sqlite3.Row) -> Dict[str, Any]:
    panel_members = []
    if row["panel_members"]:
        try:
            panel_members = json.loads(row["panel_members"])
        except Exception:
            pass

    provider = row["provider"] if "provider" in row.keys() and row["provider"] else "google"
    external_event_id = row["external_event_id"] if "external_event_id" in row.keys() else None

    return {
        "id": row["id"],
        "candidateId": row["candidate_id"],
        "candidateName": row["candidate_name"],
        "candidateEmail": row["candidate_email"],
        "candidateRole": row["candidate_role"],
        "candidateAtsScore": row["candidate_ats_score"],
        "interviewType": row["interview_type"],
        "date": row["date"],
        "startTime": row["start_time"],
        "endTime": row["end_time"],
        "durationMinutes": row["duration_minutes"],
        "deliveryMode": row["delivery_mode"],
        "meetUrl": row["meet_url"],
        "location": row["location"],
        "buildingFloor": row["building_floor"],
        "panelMembers": panel_members,
        "externalEventId": external_event_id,
        "provider": provider,
        "status": row["status"] or "scheduled",
        "agenda": row["agenda"] or "",
        "createdAt": row["created_at"],
    }

def get_all_interviews(provider: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if provider:
        cursor.execute("SELECT * FROM interviews WHERE LOWER(provider) = LOWER(?) ORDER BY created_at DESC", (provider.strip(),))
    else:
        cursor.execute("SELECT * FROM interviews ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [serialize_interview_row(r) for r in rows]

def create_interview_in_db(interview: Dict[str, Any], provider: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    inv_id = interview.get("id") or f"interview-{int(os.times().system * 1000)}"
    prov = (provider or interview.get("provider") or "google").strip().lower()
    panel_json = json.dumps(interview.get("panelMembers", []))
    ext_id = interview.get("externalEventId") or interview.get("external_event_id") or ""

    cursor.execute("""
        INSERT OR REPLACE INTO interviews (
            id, candidate_id, candidate_name, candidate_email, candidate_role, candidate_ats_score,
            interview_type, date, start_time, end_time, duration_minutes, delivery_mode, meet_url,
            location, building_floor, panel_members, external_event_id, provider, status, agenda, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (
        inv_id,
        interview.get("candidateId", ""),
        interview.get("candidateName", ""),
        interview.get("candidateEmail", ""),
        interview.get("candidateRole", ""),
        interview.get("candidateAtsScore", 90.0),
        interview.get("interviewType", "Technical Interview"),
        interview.get("date", ""),
        interview.get("startTime", ""),
        interview.get("endTime", ""),
        interview.get("durationMinutes", 60),
        interview.get("deliveryMode", "in-person"),
        interview.get("meetUrl", ""),
        interview.get("location", ""),
        interview.get("buildingFloor", ""),
        panel_json,
        ext_id,
        prov,
        interview.get("status", "scheduled"),
        interview.get("agenda", ""),
    ))
    conn.commit()
    conn.close()
    return interview

def cancel_interview_in_db(interview_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE interviews SET status = 'cancelled' WHERE id = ?", (interview_id,))
    conn.commit()
    cursor.execute("SELECT * FROM interviews WHERE id = ?", (interview_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return serialize_interview_row(row)
    return None

def delete_interview_in_db(interview_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM interviews WHERE id = ?", (interview_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

