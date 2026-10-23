from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import traceback
from services.microsoft_calendar_service import MicrosoftCalendarService

router = APIRouter(prefix="/api/calendar/microsoft", tags=["Microsoft Outlook & Teams Calendar"])

class MicrosoftFreeBusyRequest(BaseModel):
    emails: List[str]
    time_min: str
    time_max: str

class MicrosoftCreateEventRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    attendees: List[str]
    description: Optional[str] = ""
    location: Optional[str] = "Microsoft Teams Meeting"
    create_teams: Optional[bool] = True

def extract_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Microsoft OAuth access token required")
    return authorization.split(" ")[1]

@router.get("/my-events")
def get_my_microsoft_events(
    date: str = Query(..., description="Date format YYYY-MM-DD"),
    authorization: Optional[str] = Header(None),
):
    token = extract_token(authorization)
    if token.startswith("demo-") or token.startswith("mock-"):
        return {"date": date, "events": [], "provider": "microsoft"}
    start_datetime = f"{date}T00:00:00Z"
    end_datetime = f"{date}T23:59:59Z"
    try:
        events = MicrosoftCalendarService.get_user_events(token, start_datetime, end_datetime)
        return {"date": date, "events": events, "provider": "microsoft"}
    except Exception as exc:
        traceback.print_exc()
        err_msg = str(exc).lower()
        if "expired" in err_msg or "invalid" in err_msg or "unauthorized" in err_msg:
            return {"date": date, "events": [], "provider": "microsoft"}
        raise HTTPException(status_code=500, detail=f"Microsoft Calendar service error: {str(exc)}")

@router.post("/panel-events")
def get_microsoft_panel_events(
    req: MicrosoftFreeBusyRequest,
    authorization: Optional[str] = Header(None),
):
    token = extract_token(authorization)
    try:
        result = MicrosoftCalendarService.get_panel_events_for_emails(
            access_token=token,
            emails=req.emails,
            start_datetime=req.time_min,
            end_datetime=req.time_max,
        )
        return {"calendars": result, "provider": "microsoft"}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Microsoft Panel Events error: {str(exc)}")

@router.post("/events")
def create_teams_event(
    req: MicrosoftCreateEventRequest,
    authorization: Optional[str] = Header(None),
):
    token = extract_token(authorization)
    try:
        event = MicrosoftCalendarService.create_teams_interview_event(
            access_token=token,
            title=req.title,
            start_time=req.start_time,
            end_time=req.end_time,
            attendees=req.attendees,
            description=req.description or "",
            location=req.location or "Microsoft Teams Meeting",
            create_teams=req.create_teams if req.create_teams is not None else True,
        )
        return {
            "status": "success",
            "message": "Real Microsoft Outlook event created with Microsoft Teams link",
            "event": event,
        }
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Microsoft Teams event creation error: {str(exc)}")

@router.delete("/events/{event_id}")
def delete_microsoft_event(
    event_id: str,
    authorization: Optional[str] = Header(None),
):
    token = extract_token(authorization)
    try:
        MicrosoftCalendarService.delete_teams_event(token, event_id)
        return {
            "status": "success",
            "message": f"Real Microsoft Outlook event {event_id} successfully deleted",
            "eventId": event_id,
        }
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Microsoft event deletion error: {str(exc)}")

