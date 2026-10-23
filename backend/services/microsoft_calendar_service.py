import requests
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

class MicrosoftCalendarService:
    GRAPH_BASE = "https://graph.microsoft.com/v1.0"

    @staticmethod
    def _headers(access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": 'outlook.timezone="UTC"',
        }

    @staticmethod
    def get_user_events(access_token: str, start_datetime: str, end_datetime: str) -> List[Dict[str, Any]]:
        """
        Fetches calendar events for the authenticated Microsoft user via Graph API calendarView
        """
        url = f"{MicrosoftCalendarService.GRAPH_BASE}/me/calendarView"
        params = {
            "startDateTime": start_datetime,
            "endDateTime": end_datetime,
            "$orderby": "start/dateTime",
            "$top": 50,
        }
        resp = requests.get(
            url,
            headers=MicrosoftCalendarService._headers(access_token),
            params=params,
            timeout=10,
        )
        if resp.status_code != 200:
            raise Exception(f"Microsoft Graph calendar error: {resp.status_code} - {resp.text}")

        items = resp.json().get("value", [])
        events = []
        for item in items:
            start_dict = item.get("start") or {}
            end_dict = item.get("end") or {}
            start_raw = start_dict.get("dateTime")
            end_raw = end_dict.get("dateTime")

            # Ensure timezone indicator Z is present for UTC strings
            if start_raw and not str(start_raw).endswith("Z") and "+" not in str(start_raw):
                start_raw = f"{start_raw}Z"
            if end_raw and not str(end_raw).endswith("Z") and "+" not in str(end_raw):
                end_raw = f"{end_raw}Z"

            start_time = "09:00"
            end_time = "10:00"
            if start_raw and "T" in str(start_raw):
                start_time = str(start_raw).split("T")[1][:5]
            if end_raw and "T" in str(end_raw):
                end_time = str(end_raw).split("T")[1][:5]

            online_meeting = item.get("onlineMeeting") or {}
            is_teams = bool(item.get("isOnlineMeeting") or online_meeting.get("joinUrl"))
            teams_link = (
                online_meeting.get("joinUrl")
                or item.get("webLink")
                or ""
            )

            events.append({
                "id": item.get("id"),
                "title": item.get("subject") or "Busy Meeting",
                "startTime": start_time,
                "endTime": end_time,
                "startRaw": start_raw,
                "endRaw": end_raw,
                "type": "busy",
                "description": item.get("bodyPreview") or "",
                "teamsLink": teams_link if is_teams else None,
                "platform": "microsoft_teams" if is_teams else "outlook",
            })
        return events

    @staticmethod
    def query_get_schedule(
        access_token: str,
        emails: List[str],
        start_datetime: str,
        end_datetime: str,
    ) -> Dict[str, Any]:
        """
        Queries Microsoft Graph getSchedule API to inspect busy time intervals across panel members
        """
        url = f"{MicrosoftCalendarService.GRAPH_BASE}/me/calendar/getSchedule"
        body = {
            "schedules": emails,
            "startTime": {
                "dateTime": start_datetime,
                "timeZone": "UTC",
            },
            "endTime": {
                "dateTime": end_datetime,
                "timeZone": "UTC",
            },
            "availabilityViewInterval": 15,
        }
        resp = requests.post(
            url,
            headers=MicrosoftCalendarService._headers(access_token),
            json=body,
            timeout=10,
        )
        if resp.status_code != 200:
            raise Exception(f"Microsoft getSchedule error: {resp.status_code} - {resp.text}")

        return resp.json()

    @staticmethod
    def get_panel_events_for_emails(
        access_token: str,
        emails: List[str],
        start_datetime: str,
        end_datetime: str,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retrieves panel availability across multiple Microsoft organization members
        """
        result: Dict[str, List[Dict[str, Any]]] = {}
        try:
            sched_data = MicrosoftCalendarService.query_get_schedule(
                access_token, emails, start_datetime, end_datetime
            )
            items = sched_data.get("value", [])
            for item in items:
                email = (item.get("scheduleId") or "").lower()
                schedule_items = item.get("scheduleItems", [])
                events = []
                for idx, s_item in enumerate(schedule_items):
                    status = s_item.get("status", "busy")
                    if status.lower() in ["free", "workingelsewhere"]:
                        continue
                    start_dict = s_item.get("start") or {}
                    end_dict = s_item.get("end") or {}
                    start_raw = start_dict.get("dateTime")
                    end_raw = end_dict.get("dateTime")

                    if start_raw and not str(start_raw).endswith("Z") and "+" not in str(start_raw):
                        start_raw = f"{start_raw}Z"
                    if end_raw and not str(end_raw).endswith("Z") and "+" not in str(end_raw):
                        end_raw = f"{end_raw}Z"

                    subject = s_item.get("subject") or "Busy Meeting"

                    start_time = "09:00"
                    end_time = "10:00"
                    if start_raw and "T" in str(start_raw):
                        start_time = str(start_raw).split("T")[1][:5]
                    if end_raw and "T" in str(end_raw):
                        end_time = str(end_raw).split("T")[1][:5]

                    events.append({
                        "id": f"ms-sched-{email}-{idx}",
                        "title": subject,
                        "startTime": start_time,
                        "endTime": end_time,
                        "startRaw": start_raw,
                        "endRaw": end_raw,
                        "type": "busy",
                        "description": f"Outlook status: {status}",
                    })
                result[email] = events
        except Exception as exc:
            print(f"Microsoft getSchedule fallback notice: {exc}")
            for email in emails:
                if email.lower() not in result:
                    result[email.lower()] = []

        return result

    @staticmethod
    def create_teams_interview_event(
        access_token: str,
        title: str,
        start_time: str,
        end_time: str,
        attendees: List[str],
        description: str = "",
        location: str = "Microsoft Teams Meeting",
        create_teams: bool = True,
    ) -> Dict[str, Any]:
        """
        Creates a real event in Microsoft Outlook with a live Microsoft Teams meeting link
        """
        url = f"{MicrosoftCalendarService.GRAPH_BASE}/me/events"
        event_body: Dict[str, Any] = {
            "subject": title,
            "body": {
                "contentType": "HTML",
                "content": f"<p>{description}</p><p>Scheduled via Interview Panel Scheduler.</p>",
            },
            "start": {
                "dateTime": start_time,
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_time,
                "timeZone": "UTC",
            },
            "location": {
                "displayName": location,
            },
            "attendees": [
                {
                    "emailAddress": {"address": e, "name": e.split("@")[0]},
                    "type": "required",
                }
                for e in attendees
            ],
        }

        if create_teams:
            event_body["isOnlineMeeting"] = True
            event_body["onlineMeetingProvider"] = "teamsForBusiness"

        resp = requests.post(
            url,
            headers=MicrosoftCalendarService._headers(access_token),
            json=event_body,
            timeout=15,
        )

        if resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create Microsoft Teams event: {resp.status_code} - {resp.text}")

        data = resp.json()
        online_meeting = data.get("onlineMeeting") or {}
        join_url = online_meeting.get("joinUrl") or data.get("webLink") or ""
        start_dict = data.get("start") or {}
        end_dict = data.get("end") or {}

        return {
            "id": data.get("id"),
            "title": data.get("subject"),
            "start": start_dict.get("dateTime"),
            "end": end_dict.get("dateTime"),
            "teamsLink": join_url,
            "htmlLink": data.get("webLink"),
            "provider": "microsoft_teams",
        }

    @staticmethod
    def delete_teams_event(access_token: str, event_id: str) -> bool:
        """
        Deletes a real event from Microsoft Outlook / Teams via Graph API
        """
        url = f"{MicrosoftCalendarService.GRAPH_BASE}/me/events/{event_id}"
        resp = requests.delete(
            url,
            headers=MicrosoftCalendarService._headers(access_token),
            timeout=15,
        )
        if resp.status_code in [200, 204]:
            return True
        if resp.status_code == 404:
            return True  # Already deleted
        raise Exception(f"Failed to delete Microsoft Teams event: {resp.status_code} - {resp.text}")

