from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.db_service import (
    get_all_panel_members,
    get_panel_member_by_id,
    upsert_panel_member,
    save_all_panel_members,
    delete_panel_member,
)

router = APIRouter(prefix="/api/panel-members", tags=["Panel Members Database"])

class WorkingHoursModel(BaseModel):
    start: Optional[str] = "09:00"
    end: Optional[str] = "18:00"

class PanelMemberPayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: str
    provider: Optional[str] = "google"
    role: Optional[str] = "Technical Interviewer"
    department: Optional[str] = "Engineering & Technology"
    avatar: Optional[str] = None
    skills: Optional[List[str]] = None
    timezone: Optional[str] = "UTC+05:30 (IST)"
    workingHours: Optional[WorkingHoursModel] = None
    eventsByDate: Optional[Dict[str, Any]] = None

@router.get("")
def list_panel_members(provider: Optional[str] = Query(None)):
    """Retrieve panel members saved in SQLite database filtered by provider if specified"""
    members = get_all_panel_members(provider=provider)
    return {"panelMembers": members, "count": len(members), "provider": provider}

@router.post("")
def add_or_update_panel_member(payload: PanelMemberPayload, provider: Optional[str] = Query(None)):
    """Add a new panel member or update existing one in database for specific provider"""
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="A valid email address is required")
    
    data = payload.dict(exclude_unset=True)
    prov = provider or payload.provider or "google"
    data["provider"] = prov
    if "workingHours" in data and isinstance(data["workingHours"], dict):
        data["workingHours"] = payload.workingHours.dict() if payload.workingHours else {"start": "09:00", "end": "18:00"}
    
    saved = upsert_panel_member(data, provider=prov)
    return {"status": "success", "panelMember": saved}

@router.put("/sync")
def sync_panel_members(members: List[Dict[str, Any]] = Body(...), provider: Optional[str] = Query(None)):
    """Batch synchronize panel members to database for specific provider"""
    saved = save_all_panel_members(members, provider=provider)
    return {"status": "success", "panelMembers": saved, "count": len(saved), "provider": provider}

@router.delete("/{member_id}")
def remove_panel_member(member_id: str, provider: Optional[str] = Query(None)):
    """Delete panel member by ID or email from database (scoped to provider if given)"""
    deleted = delete_panel_member(member_id, provider=provider)
    if not deleted:
        return {"status": "not_found", "message": f"Member {member_id} not found in database"}
    return {"status": "success", "message": f"Member {member_id} deleted successfully"}
