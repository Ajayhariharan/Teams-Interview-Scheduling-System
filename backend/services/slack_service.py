import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List

class SlackService:
    @staticmethod
    def get_config() -> Dict[str, Any]:
        webhook_url = os.getenv("SLACK_WEBHOOK_URL", "").strip()
        bot_token = os.getenv("SLACK_BOT_TOKEN", "").strip()
        channel = os.getenv("SLACK_DEFAULT_CHANNEL", "#interviews").strip()
        
        is_configured = bool(webhook_url or bot_token)
        return {
            "configured": is_configured,
            "has_webhook": bool(webhook_url),
            "has_bot_token": bool(bot_token),
            "webhook_url": webhook_url if webhook_url else None,
            "bot_token_preview": f"{bot_token[:8]}••••••••" if bot_token else None,
            "channel": channel,
        }

    @staticmethod
    def build_interview_blocks(interview: Dict[str, Any], action: str = "scheduled") -> List[Dict[str, Any]]:
        candidate_name = interview.get("candidateName", "Candidate")
        candidate_role = interview.get("candidateRole", "Software Engineer")
        candidate_email = interview.get("candidateEmail", "")
        ats_score = interview.get("candidateAtsScore", None)
        interview_type = interview.get("interviewType", "Technical Interview")
        date = interview.get("date", "Today")
        start_time = interview.get("startTime", "")
        end_time = interview.get("endTime", "")
        duration = interview.get("durationMinutes", 60)
        location = interview.get("location", "Video Call")
        delivery_mode = interview.get("deliveryMode", "google-meet")
        meet_url = interview.get("meetUrl") or interview.get("googleCalendarLink") or ""
        agenda = interview.get("agenda", "")
        panel_members = interview.get("panelMembers", [])

        panel_names = ", ".join([p.get("name", "") for p in panel_members if p.get("name")]) or "Hiring Panel"

        if action == "cancelled":
            header_text = f"❌ Interview Cancelled: {candidate_name} ({candidate_role})"
            status_badge = "🚨 *Status: CANCELLED*"
        else:
            header_text = f"🗓️ Interview Scheduled: {candidate_name} ({candidate_role})"
            status_badge = "✅ *Status: CONFIRMED & SCHEDULED*"

        ats_str = f" • ATS Score: *{ats_score}%*" if ats_score else ""

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": header_text[:150],
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_badge}\n*Round:* {interview_type}{ats_str}"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"👤 *Candidate:*\n{candidate_name} ({candidate_email})"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"💼 *Position:*\n{candidate_role}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"📅 *Date & Time:*\n{date} • {start_time} - {end_time} ({duration}m)"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"👥 *Panel Interviewers:*\n{panel_names}"
                    }
                ]
            }
        ]

        if agenda:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"📝 *Interview Agenda:*\n_{agenda}_"
                }
            })

        # Call Link Button or Details
        elements = []
        if meet_url and action != "cancelled":
            btn_text = "Join Google Meet" if "meet.google" in meet_url else ("Join Microsoft Teams" if "teams.microsoft" in meet_url else "Join Video Meeting")
            elements.append({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": f"🎥 {btn_text}",
                    "emoji": True
                },
                "url": meet_url,
                "style": "primary"
            })

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        elements.append({
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": "📊 Open ATS Dashboard",
                "emoji": True
            },
            "url": frontend_url
        })

        if elements:
            blocks.append({
                "type": "actions",
                "elements": elements
            })

        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "*Interview Panel Scheduler* • Real-time Calendar & ATS Sync"
                }
            ]
        })

        return blocks

    @staticmethod
    def send_webhook_message(webhook_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                return {"success": True, "response": body}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_bot_message(bot_token: str, channel: str, blocks: List[Dict[str, Any]], fallback_text: str) -> Dict[str, Any]:
        url = "https://slack.com/api/chat.postMessage"
        payload = {
            "channel": channel,
            "text": fallback_text,
            "blocks": blocks
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {bot_token}"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                if not res_data.get("ok"):
                    return {"success": False, "error": res_data.get("error", "Unknown Slack API error")}
                return {"success": True, "ts": res_data.get("ts"), "channel": res_data.get("channel")}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_notification(
        interview_data: Dict[str, Any],
        action: str = "scheduled",
        custom_webhook: Optional[str] = None,
        custom_token: Optional[str] = None,
        custom_channel: Optional[str] = None,
    ) -> Dict[str, Any]:
        webhook_url = custom_webhook or os.getenv("SLACK_WEBHOOK_URL", "").strip()
        bot_token = custom_token or os.getenv("SLACK_BOT_TOKEN", "").strip()
        channel = custom_channel or os.getenv("SLACK_DEFAULT_CHANNEL", "#interviews").strip()

        candidate_name = interview_data.get("candidateName", "Candidate")
        role = interview_data.get("candidateRole", "Role")
        fallback_text = f"Interview {action}: {candidate_name} for {role}"

        blocks = SlackService.build_interview_blocks(interview_data, action=action)

        # 1. If Webhook URL is provided, send via webhook
        if webhook_url:
            return SlackService.send_webhook_message(webhook_url, {
                "text": fallback_text,
                "blocks": blocks
            })

        # 2. If Bot Token is provided, send via chat.postMessage
        if bot_token:
            return SlackService.send_bot_message(bot_token, channel, blocks, fallback_text)

        return {
            "success": False,
            "error": "No Slack Webhook URL or Bot Token configured. Add SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN in backend/.env"
        }

    @staticmethod
    def test_connection(
        webhook_url: Optional[str] = None,
        bot_token: Optional[str] = None,
        channel: Optional[str] = None
    ) -> Dict[str, Any]:
        test_payload = {
            "candidateName": "Alex Morgan (Test)",
            "candidateEmail": "alex.morgan@test.com",
            "candidateRole": "Principal Systems Engineer",
            "candidateAtsScore": 98.5,
            "interviewType": "System Architecture & Live Coding",
            "date": "2026-09-30",
            "startTime": "10:00 AM",
            "endTime": "11:00 AM",
            "durationMinutes": 60,
            "location": "Google Meet / Microsoft Teams",
            "deliveryMode": "google-meet",
            "meetUrl": "https://meet.google.com/test-demo-call",
            "panelMembers": [
                {"name": "Alex Johnson", "email": "alex.sample@example.com", "role": "Senior Panelist"}
            ],
            "agenda": "Live validation test of Slack interview alerts from SUG Scheduler."

        }
        return SlackService.send_notification(
            interview_data=test_payload,
            action="scheduled",
            custom_webhook=webhook_url,
            custom_token=bot_token,
            custom_channel=channel
        )
