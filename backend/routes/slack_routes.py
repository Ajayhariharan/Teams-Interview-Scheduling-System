from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from services.slack_service import SlackService

router = APIRouter(prefix="/api/slack", tags=["Slack Integration & Notifications"])

class SlackNotifyRequest(BaseModel):
    interview: Dict[str, Any]
    action: Optional[str] = "scheduled"
    webhook_url: Optional[str] = None
    bot_token: Optional[str] = None
    channel: Optional[str] = None

class SlackTestRequest(BaseModel):
    webhook_url: Optional[str] = None
    bot_token: Optional[str] = None
    channel: Optional[str] = None

@router.get("/status")
def get_slack_status():
    """
    Returns whether Slack integration is active and configured in backend .env
    """
    return SlackService.get_config()

@router.post("/notify")
def send_slack_notification(req: SlackNotifyRequest):
    """
    Dispatches a formatted Block Kit interview notification to Slack
    """
    result = SlackService.send_notification(
        interview_data=req.interview,
        action=req.action or "scheduled",
        custom_webhook=req.webhook_url,
        custom_token=req.bot_token,
        custom_channel=req.channel,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send Slack alert"))
    return {"status": "success", "result": result}

@router.post("/test")
def test_slack_alert(req: SlackTestRequest = Body(default=SlackTestRequest())):
    """
    Sends a test interview alert to verify Webhook or Bot Token permissions
    """
    result = SlackService.test_connection(
        webhook_url=req.webhook_url,
        bot_token=req.bot_token,
        channel=req.channel,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Slack test notification failed"))
    return {"status": "success", "message": "Test notification sent successfully to Slack!", "result": result}
