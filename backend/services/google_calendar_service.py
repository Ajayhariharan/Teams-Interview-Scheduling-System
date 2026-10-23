import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class GoogleCalendarService:
    @staticmethod
    def get_service(access_token: str):
        creds = Credentials(token=access_token)
        return build("calendar", "v3", credentials=creds)

    @staticmethod
    def get_user_events(access_token: str, time_min: str, time_max: str) -> List[Dict[str, Any]]:
        """
        Fetches real calendar events for the user's primary Google Calendar
        """
        service = GoogleCalendarService.get_service(access_token)
        events_result = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        
        items = events_result.get("items", [])
        events = []
        for item in items:
            start_raw = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date")
            end_raw = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")
            
            # Format to HH:mm
            start_time = "09:00"
            end_time = "10:00"
            if "T" in str(start_raw):
                start_time = start_raw.split("T")[1][:5]
            if "T" in str(end_raw):
                end_time = end_raw.split("T")[1][:5]
                
            events.append({
                "id": item.get("id"),
                "title": item.get("summary", "Busy / Meeting"),
                "startTime": start_time,
                "endTime": end_time,
                "startRaw": start_raw,
                "endRaw": end_raw,
                "type": "busy",
                "description": item.get("description", ""),
                "htmlLink": item.get("htmlLink", ""),
            })
        return events

    @staticmethod
    def query_freebusy(
        access_token: str,
        emails: List[str],
        time_min: str,
        time_max: str
    ) -> Dict[str, Any]:
        """
        Calls Google Calendar Free/Busy API to inspect real busy intervals
        """
        service = GoogleCalendarService.get_service(access_token)
        body = {
            "timeMin": time_min,
            "timeMax": time_max,
            "items": [{"id": e} for e in emails],
        }
        freebusy_result = service.freebusy().query(body=body).execute()
        return freebusy_result

    @staticmethod
    def get_panel_events_for_emails(
        access_token: str,
        emails: List[str],
        time_min: str,
        time_max: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetches calendar events for multiple panel members.
        Tries to read full event details (e.g. 'Team Sync') first if the calendar is accessible.
        Falls back to Google FreeBusy API if restricted/private within workspace domain.
        """
        service = GoogleCalendarService.get_service(access_token)

        result: Dict[str, List[Dict[str, Any]]] = {}
        emails_needing_freebusy = []

        for email in emails:
            email_lower = email.lower()
            try:
                events_result = service.events().list(
                    calendarId=email,
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    orderBy="startTime"
                ).execute()
                items = events_result.get("items", [])
                event_list = []
                for item in items:
                    start_raw = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date")
                    end_raw = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")
                    summary = item.get("summary") or "Busy Meeting"
                    
                    start_time = "09:00"
                    end_time = "10:00"
                    if "T" in str(start_raw):
                        start_time = start_raw.split("T")[1][:5]
                    if "T" in str(end_raw):
                        end_time = end_raw.split("T")[1][:5]
                    
                    event_list.append({
                        "id": item.get("id", str(uuid.uuid4())),
                        "title": summary,
                        "startTime": start_time,
                        "endTime": end_time,
                        "startRaw": start_raw,
                        "endRaw": end_raw,
                        "type": "busy",
                        "description": item.get("description", ""),
                        "htmlLink": item.get("htmlLink", ""),
                    })
                result[email_lower] = event_list
            except Exception:
                # Calendar events listing not directly accessible (private / FreeBusy only)
                emails_needing_freebusy.append(email)

        # Fallback to FreeBusy for emails that couldn't be read directly
        if emails_needing_freebusy:
            try:
                body = {
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "items": [{"id": e} for e in emails_needing_freebusy],
                }
                fb_result = service.freebusy().query(body=body).execute()
                calendars = fb_result.get("calendars", {})
                for email, cal_data in calendars.items():
                    email_lower = email.lower()
                    busy_list = cal_data.get("busy", [])
                    events = []
                    for idx, b in enumerate(busy_list):
                        start_raw = b.get("start")
                        end_raw = b.get("end")
                        events.append({
                            "id": f"fb-{email_lower}-{idx}",
                            "title": "Busy Meeting",
                            "startTime": "09:00",
                            "endTime": "10:00",
                            "startRaw": start_raw,
                            "endRaw": end_raw,
                            "type": "busy",
                            "description": f"Busy ({start_raw} - {end_raw})",
                        })
                    result[email_lower] = events
            except Exception as fb_err:
                print(f"Freebusy fallback error: {fb_err}")
                for email in emails_needing_freebusy:
                    if email.lower() not in result:
                        result[email.lower()] = []

        return result

    @staticmethod
    def create_interview_event(
        access_token: str,
        title: str,
        start_time: str,
        end_time: str,
        attendees: List[str],
        description: str = "",
        location: str = "Google Meet Video Call",
        create_meet: bool = True
    ) -> Dict[str, Any]:
        """
        Creates a REAL event in Google Calendar with Google Meet link and sends invitations
        """
        service = GoogleCalendarService.get_service(access_token)
        
        event_body = {
            "summary": title,
            "description": description,
            "start": {"dateTime": start_time, "timeZone": "UTC"},
            "end": {"dateTime": end_time, "timeZone": "UTC"},
            "attendees": [{"email": e} for e in attendees],
        }

        if create_meet:
            event_body["conferenceData"] = {
                "createRequest": {
                    "requestId": f"sug-meet-{uuid.uuid4().hex[:8]}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }
        elif location:
            event_body["location"] = location

        created_event = service.events().insert(
            calendarId="primary",
            body=event_body,
            conferenceDataVersion=1 if create_meet else 0,
            sendUpdates="all"  # Send real email notifications to all attendees
        ).execute()

        meet_url = created_event.get("hangoutLink", "")
        return {
            "id": created_event.get("id"),
            "summary": created_event.get("summary"),
            "htmlLink": created_event.get("htmlLink"),
            "meetUrl": meet_url,
            "status": created_event.get("status"),
            "start": created_event.get("start"),
            "end": created_event.get("end"),
            "attendees": created_event.get("attendees", []),
        }

    @staticmethod
    def delete_interview_event(access_token: str, event_id: str) -> bool:
        """
        Deletes a real event from Google Calendar and sends cancellation updates to attendees
        """
        service = GoogleCalendarService.get_service(access_token)
        try:
            service.events().delete(
                calendarId="primary",
                eventId=event_id,
                sendUpdates="all"
            ).execute()
            return True
        except HttpError as exc:
            if exc.resp.status in [404, 400]:
                # If direct ID failed or event_id was custom/partial, search events on primary calendar
                try:
                    events_res = service.events().list(
                        calendarId="primary",
                        maxResults=30,
                    ).execute()
                    items = events_res.get("items", [])
                    deleted = False
                    for itm in items:
                        summary = (itm.get("summary") or "").lower()
                        desc = (itm.get("description") or "").lower()
                        if (
                            itm.get("id") == event_id
                            or (event_id and event_id in summary)
                            or (event_id and event_id in desc)
                        ):
                            service.events().delete(
                                calendarId="primary",
                                eventId=itm["id"],
                                sendUpdates="all"
                            ).execute()
                            deleted = True
                    if deleted:
                        return True
                except Exception as inner_e:
                    print(f"Fallback search delete error: {inner_e}")
                return True
            raise

