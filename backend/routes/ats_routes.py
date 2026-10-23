from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import traceback
from services.db_service import (
    get_all_candidates,
    get_candidate_by_id,
    upsert_candidate,
    update_candidate_stage_in_db,
    update_candidate_questions_in_db,
    delete_candidate_in_db,
)
from services.ats_service import (
    document_parser,
    refine_experience_and_projects_ai,
    generate_candidate_interview_questions_ai,
    calculate_years_experience
)

router = APIRouter(prefix="/api/ats", tags=["ATS Candidate 360°"])

class CandidatePayload(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = ""
    position: str
    department: Optional[str] = "General Engineering"
    experienceYears: Optional[float] = 3.0
    currentStage: Optional[str] = "Screening"
    skills: Optional[List[str]] = None
    avatar: Optional[str] = None
    appliedDate: Optional[str] = None
    atsScore: Optional[float] = 90.0
    resumeFileName: Optional[str] = None
    resumeText: Optional[str] = None
    summary: Optional[str] = None
    experienceRecords: Optional[List[Dict[str, Any]]] = None
    projectRecords: Optional[List[Dict[str, Any]]] = None
    educationRecords: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    achievements: Optional[List[str]] = None
    outliers: Optional[List[Dict[str, Any]]] = None
    generatedQuestions: Optional[List[Dict[str, Any]]] = None

class CandidateUpdateStageRequest(BaseModel):
    candidate_id: str
    new_stage: str

class GenerateQuestionsRequest(BaseModel):
    candidateId: Optional[str] = None
    candidateName: str
    role: str
    skills: Optional[List[str]] = None
    experienceYears: Optional[float] = 4.0
    summary: Optional[str] = ""
    experienceRecords: Optional[List[Dict[str, Any]]] = None
    projectRecords: Optional[List[Dict[str, Any]]] = None
    rawResumeText: Optional[str] = ""

@router.get("/candidates")
def get_candidates():
    """Retrieve all candidates from persistent SQLite database"""
    candidates = get_all_candidates()
    return {"candidates": candidates, "count": len(candidates)}

@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: str):
    """Retrieve single candidate by ID"""
    cand = get_candidate_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"status": "success", "candidate": cand}

@router.post("/candidates")
def add_candidate(payload: CandidatePayload):
    """Add or update candidate in persistent SQLite database"""
    saved = upsert_candidate(payload.dict(exclude_unset=True))
    return {"status": "success", "candidate": saved}

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: str):
    """Delete candidate from persistent SQLite database"""
    deleted = delete_candidate_in_db(candidate_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"status": "success", "message": "Candidate deleted successfully"}

@router.post("/stage")
def update_stage(req: CandidateUpdateStageRequest):
    """Update candidate ATS progression stage in database"""
    updated = update_candidate_stage_in_db(req.candidate_id, req.new_stage)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "status": "success",
        "message": f"Candidate {updated['name']} updated to stage: {req.new_stage}",
        "candidate": updated,
    }

@router.post("/parse-preview")
async def parse_resume_preview(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form("Senior Full Stack Engineer"),
    department: Optional[str] = Form("General Engineering"),
    candidate_name: Optional[str] = Form(None)
):
    """
    Parses resume document (PDF, DOCX, TXT) using DocumentParser + OpenRouter Gemini AI
    and returns structured resume preview data for recruiter verification.
    """
    try:
        content = await file.read()
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 15MB.")

        filename_lower = file.filename.lower()
        raw_text = ""

        if filename_lower.endswith(".pdf"):
            raw_text = document_parser.extract_pdf_text(content)
        elif filename_lower.endswith(".docx"):
            raw_text = document_parser.extract_docx_text(content)
        elif filename_lower.endswith(".txt"):
            try:
                raw_text = content.decode("utf-8")
            except Exception:
                raw_text = content.decode("latin-1", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Upload PDF, DOCX, or TXT.")

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Resume file is empty or text could not be extracted.")

        # 1. Document parser segmentation
        parsed_doc = document_parser.parse_resume(raw_text, file.filename)

        detected_name = candidate_name.strip() if candidate_name and candidate_name.strip() else parsed_doc.get("candidate_name", "Candidate Applicant")
        email_str = parsed_doc.get("email", "")
        phone_str = parsed_doc.get("phone", "")
        summary_str = parsed_doc.get("summary", "")
        skills_list = parsed_doc.get("skills_list", [])
        certifications = parsed_doc.get("certifications", [])
        achievements = parsed_doc.get("achievements", [])
        outliers = parsed_doc.get("outliers", [])

        exp_raw = parsed_doc.get("experience_raw_text", "")
        proj_raw = parsed_doc.get("projects_raw_text", "")
        edu_raw = parsed_doc.get("education_raw_text", "")
        fallback_exp = parsed_doc.get("experience_records", [])
        fallback_proj = parsed_doc.get("project_records", [])
        fallback_edu = parsed_doc.get("education_records", [])

        # 2. Refine structured records with Gemini AI
        refined_exp, refined_proj, refined_edu = await refine_experience_and_projects_ai(
            exp_text=exp_raw,
            proj_text=proj_raw,
            edu_text=edu_raw,
            fallback_exp=fallback_exp,
            fallback_proj=fallback_proj,
            fallback_edu=fallback_edu
        )

        # 3. Calculate experience tenure
        years_exp = 0.0
        if refined_exp:
            for exp in refined_exp:
                p_text = f"{exp.get('period', '')} {exp.get('title', '')} {exp.get('company', '')}".strip()
                years_exp += calculate_years_experience(p_text)
            years_exp = max(1.0, round(years_exp, 1))
        else:
            years_exp = max(1.0, round(calculate_years_experience(raw_text), 1))

        # 4. ATS score estimation based on extracted depth
        base_score = 80.0
        if len(skills_list) >= 6: base_score += 6.0
        elif len(skills_list) >= 3: base_score += 3.0
        if len(refined_exp) >= 2: base_score += 5.0
        if len(refined_proj) >= 2: base_score += 4.0
        if len(refined_edu) >= 1: base_score += 3.0
        ats_score = min(98.5, round(base_score, 1))

        return {
            "status": "success",
            "candidate_name": detected_name,
            "email": email_str,
            "phone": phone_str,
            "position": target_role,
            "department": department,
            "experience_years": years_exp,
            "ats_score": ats_score,
            "summary": summary_str,
            "experience_records": refined_exp,
            "project_records": refined_proj,
            "education_records": refined_edu,
            "skills_list": skills_list,
            "certifications": certifications,
            "achievements": achievements,
            "outliers": outliers,
            "raw_text": raw_text,
            "filename": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Resume extraction error: {str(e)}")

@router.post("/generate-questions")
async def generate_interview_questions(payload: GenerateQuestionsRequest):
    """
    Generates 10 tailored interview questions specifically crafted for this candidate
    using their actual uploaded resume details and target role with Gemini AI.
    """
    try:
        skills = payload.skills or []
        questions = await generate_candidate_interview_questions_ai(
            candidate_name=payload.candidateName,
            role=payload.role,
            skills=skills,
            experience_years=payload.experienceYears or 4.0,
            resume_summary=payload.summary or "",
            experience_records=payload.experienceRecords,
            project_records=payload.projectRecords,
            raw_resume_text=payload.rawResumeText or ""
        )

        if payload.candidateId:
            update_candidate_questions_in_db(payload.candidateId, questions)

        return {
            "status": "success",
            "candidateName": payload.candidateName,
            "role": payload.role,
            "totalQuestions": len(questions),
            "questions": questions
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

@router.get("/candidates/{candidate_id}/questions")
async def get_candidate_questions(candidate_id: str):
    """
    Retrieves or generates interview questions for a saved candidate.
    """
    cand = get_candidate_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cached = cand.get("generatedQuestions")
    if cached and len(cached) == 10:
        return {
            "status": "success",
            "candidateName": cand["name"],
            "role": cand["position"],
            "totalQuestions": len(cached),
            "questions": cached,
            "cached": True
        }

    # Generate dynamically
    questions = await generate_candidate_interview_questions_ai(
        candidate_name=cand["name"],
        role=cand["position"],
        skills=cand.get("skills", []),
        experience_years=cand.get("experienceYears", 4.0),
        resume_summary=cand.get("summary", ""),
        experience_records=cand.get("experienceRecords"),
        project_records=cand.get("projectRecords"),
        raw_resume_text=cand.get("resumeText", "")
    )

    update_candidate_questions_in_db(candidate_id, questions)

    return {
        "status": "success",
        "candidateName": cand["name"],
        "role": cand["position"],
        "totalQuestions": len(questions),
        "questions": questions,
        "cached": False
    }

class UpdateQuestionsPayload(BaseModel):
    questions: List[Dict[str, Any]]

@router.put("/candidates/{candidate_id}/questions")
def update_candidate_questions_endpoint(candidate_id: str, payload: UpdateQuestionsPayload):
    """
    Stores or replaces generated interview questions for a candidate in SQLite database.
    """
    cand = get_candidate_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    success = update_candidate_questions_in_db(candidate_id, payload.questions)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update candidate questions in database")
    
    return {
        "status": "success",
        "message": f"Questions replaced successfully for candidate {candidate_id}",
        "candidateId": candidate_id,
        "totalQuestions": len(payload.questions),
        "questions": payload.questions
    }

