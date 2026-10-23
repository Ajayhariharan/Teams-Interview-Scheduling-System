from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.db_service import (
    get_all_interviews,
    create_interview_in_db,
    cancel_interview_in_db,
    delete_interview_in_db,
)

router = APIRouter(prefix="/api/interviews", tags=["Scheduled Interviews Database"])

class InterviewPayload(BaseModel):
    id: Optional[str] = None
    candidateId: Optional[str] = ""
    candidateName: Optional[str] = ""
    candidateEmail: Optional[str] = ""
    candidateRole: Optional[str] = ""
    candidateAtsScore: Optional[float] = 90.0
    interviewType: Optional[str] = "Interview"
    date: str
    startTime: str
    endTime: str
    durationMinutes: Optional[int] = 60
    deliveryMode: Optional[str] = "in-person"
    meetUrl: Optional[str] = None
    location: Optional[str] = "Main Office"
    buildingFloor: Optional[str] = "1st Floor"
    panelMembers: Optional[List[Dict[str, Any]]] = None
    externalEventId: Optional[str] = None
    provider: Optional[str] = "google"
    status: Optional[str] = "scheduled"
    agenda: Optional[str] = ""

@router.get("")
def list_interviews(provider: Optional[str] = Query(None)):
    """Get all scheduled & cancelled interviews from backend SQLite database scoped by provider if specified"""
    interviews = get_all_interviews(provider=provider)
    return {"interviews": interviews, "count": len(interviews), "provider": provider}

@router.post("")
def record_interview(payload: InterviewPayload, provider: Optional[str] = Query(None)):
    """Save newly booked interview directly into backend SQLite database for specific provider"""
    data = payload.dict(exclude_unset=True)
    prov = provider or payload.provider or "google"
    data["provider"] = prov
    saved = create_interview_in_db(data, provider=prov)
    return {"status": "success", "interview": saved}

@router.put("/{interview_id}/cancel")
def cancel_interview_endpoint(interview_id: str):
    """Mark an interview as cancelled in SQLite database"""
    cancelled = cancel_interview_in_db(interview_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"status": "success", "interview": cancelled}

@router.delete("/{interview_id}")
def delete_interview_endpoint(interview_id: str):
    """Permanently delete an interview from SQLite database"""
    deleted = delete_interview_in_db(interview_id)
    if not deleted:
        return {"status": "not_found", "message": f"Interview {interview_id} not found in database"}
    return {"status": "success", "message": f"Interview {interview_id} deleted successfully"}

