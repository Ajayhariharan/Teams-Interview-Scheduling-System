from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import traceback
from googleapiclient.errors import HttpError
from services.google_calendar_service import GoogleCalendarService

router = APIRouter(prefix="/api/calendar", tags=["Google Calendar & Meet"])

class FreeBusyRequest(BaseModel):
    emails: List[str]
    time_min: str
    time_max: str

class CreateEventRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    attendees: List[str]
    description: Optional[str] = ""
    location: Optional[str] = "Google Meet Video Call"
    create_meet: Optional[bool] = True

def extract_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Google authentication access token required")
    return authorization.split(" ")[1]

@router.get("/my-events")
def get_my_calendar_events(
    date: str = Query(..., description="Date format YYYY-MM-DD"),
    authorization: Optional[str] = Header(None)
):
    token = extract_token(authorization)
    if token.startswith("demo-") or token.startswith("mock-"):
        return {"date": date, "events": []}
    time_min = f"{date}T00:00:00Z"
    time_max = f"{date}T23:59:59Z"
    try:
        events = GoogleCalendarService.get_user_events(token, time_min, time_max)
        return {"date": date, "events": events}
    except HttpError as exc:
        traceback.print_exc()
        status = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else 400
        error_content = str(exc)
        if "accessNotConfigured" in error_content or "disabled" in error_content:
            raise HTTPException(
                status_code=403,
                detail="Google Calendar API is not enabled in your Google Cloud project. Please enable it in the Google Cloud Console: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview"
            )
        if status == 401:
            raise HTTPException(status_code=401, detail="Google authentication token expired. Please sign in again.")
        reason = exc._get_reason() if hasattr(exc, "_get_reason") else str(exc)
        raise HTTPException(status_code=status, detail=f"Google Calendar API error: {reason}")
    except Exception as exc:
        traceback.print_exc()
        err_msg = str(exc).lower()
        if "invalid_grant" in err_msg or "expired" in err_msg or "refresh" in err_msg or "credential" in err_msg:
            return {"date": date, "events": []}
        raise HTTPException(status_code=500, detail=f"Calendar service error: {str(exc)}")

@router.post("/freebusy")
def get_free_busy(req: FreeBusyRequest, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    try:
        result = GoogleCalendarService.query_freebusy(
            access_token=token,
            emails=req.emails,
            time_min=req.time_min,
            time_max=req.time_max,
        )
        return result
    except HttpError as exc:
        traceback.print_exc()
        status = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else 400
        error_content = str(exc)
        if "accessNotConfigured" in error_content or "disabled" in error_content:
            raise HTTPException(
                status_code=403,
                detail="Google Calendar API is not enabled in your Google Cloud project. Please enable it in the Google Cloud Console."
            )
        if status == 401:
            raise HTTPException(status_code=401, detail="Google authentication token expired or invalid.")
        reason = exc._get_reason() if hasattr(exc, "_get_reason") else str(exc)
        raise HTTPException(status_code=status, detail=f"Google FreeBusy error: {reason}")
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google FreeBusy error: {str(exc)}")

@router.post("/panel-events")
def get_panel_events(req: FreeBusyRequest, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    try:
        result = GoogleCalendarService.get_panel_events_for_emails(
            access_token=token,
            emails=req.emails,
            time_min=req.time_min,
            time_max=req.time_max,
        )
        return {"calendars": result}
    except HttpError as exc:
        traceback.print_exc()
        status = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else 400
        error_content = str(exc)
        if "accessNotConfigured" in error_content or "disabled" in error_content:
            raise HTTPException(
                status_code=403,
                detail="Google Calendar API is not enabled in your Google Cloud project. Please enable it in the Google Cloud Console."
            )
        if status == 401:
            raise HTTPException(status_code=401, detail="Google authentication token expired or invalid.")
        reason = exc._get_reason() if hasattr(exc, "_get_reason") else str(exc)
        raise HTTPException(status_code=status, detail=f"Google Panel Events error: {reason}")
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google Panel Events error: {str(exc)}")

@router.post("/events")
def create_event(req: CreateEventRequest, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    try:
        event = GoogleCalendarService.create_interview_event(
            access_token=token,
            title=req.title,
            start_time=req.start_time,
            end_time=req.end_time,
            attendees=req.attendees,
            description=req.description or "",
            location=req.location or "Google Meet Video Call",
            create_meet=req.create_meet if req.create_meet is not None else True,
        )
        return {
            "status": "success",
            "message": "Real Google Calendar event created with Google Meet",
            "event": event,
        }
    except HttpError as exc:
        traceback.print_exc()
        status = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else 400
        error_content = str(exc)
        if "accessNotConfigured" in error_content or "disabled" in error_content:
            raise HTTPException(
                status_code=403,
                detail="Google Calendar API is not enabled in your Google Cloud project. Please enable it in the Google Cloud Console."
            )
        if status == 401:
            raise HTTPException(status_code=401, detail="Google authentication token expired. Please re-login.")
        reason = exc._get_reason() if hasattr(exc, "_get_reason") else str(exc)
        raise HTTPException(status_code=status, detail=f"Google Calendar event creation error: {reason}")
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google Calendar event creation error: {str(exc)}")

@router.delete("/events/{event_id}")
def delete_google_event(event_id: str, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    try:
        GoogleCalendarService.delete_interview_event(token, event_id)
        return {
            "status": "success",
            "message": f"Real Google Calendar event {event_id} successfully deleted",
            "eventId": event_id,
        }
    except HttpError as exc:
        traceback.print_exc()
        status = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else 400
        if status == 404:
            return {"status": "not_found", "message": f"Event {event_id} not found in Google Calendar"}
        reason = exc._get_reason() if hasattr(exc, "_get_reason") else str(exc)
        raise HTTPException(status_code=status, detail=f"Google Calendar delete error: {reason}")
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google Calendar delete error: {str(exc)}")


