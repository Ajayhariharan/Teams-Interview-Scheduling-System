import os
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional

SLACK_AUTH_URL = "https://slack.com/openid/connect/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/openid.connect.token"
SLACK_USERINFO_URL = "https://slack.com/api/openid.connect.userInfo"

def is_slack_configured() -> bool:
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "")
    return bool(
        client_id 
        and client_secret 
        and not client_id.startswith("your-") 
        and not client_secret.startswith("your-")
    )

def get_slack_auth_url(state: Optional[str] = None) -> str:
    client_id = os.getenv("SLACK_CLIENT_ID", "your-slack-client-id")
    redirect_uri = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/auth/slack/callback")
    
    scopes = ["openid", "email", "profile"]
    
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": " ".join(scopes),
    }
    if state:
        params["state"] = state
    return f"{SLACK_AUTH_URL}?{urllib.parse.urlencode(params)}"

def exchange_slack_code_for_token(code: str) -> Dict[str, Any]:
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "")
    redirect_uri = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/auth/slack/callback")

    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }).encode("utf-8")

    req = urllib.request.Request(
        SLACK_TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        res = json.loads(response.read().decode("utf-8"))
        if not res.get("ok"):
            raise Exception(res.get("error", "Slack token exchange failed"))
        return res

def get_slack_user_info(access_token: str) -> Dict[str, Any]:
    req = urllib.request.Request(
        SLACK_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        res = json.loads(response.read().decode("utf-8"))
        if not res.get("ok"):
            raise Exception(res.get("error", "Failed to retrieve Slack user profile"))
        return res
