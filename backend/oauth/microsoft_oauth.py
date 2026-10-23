import os
import requests
from urllib.parse import urlencode
from typing import Dict, Any, Optional

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "common")
MICROSOFT_REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback")

MICROSOFT_SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Calendars.Read",
    "Calendars.ReadWrite",
    "OnlineMeetings.ReadWrite",
]

def is_microsoft_configured() -> bool:
    """Returns True if user has configured actual Microsoft Azure client credentials"""
    client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
    return bool(client_id and client_id != "your-azure-app-client-id" and not client_id.startswith("your-"))

def get_microsoft_auth_url(state: Optional[str] = None) -> str:
    """
    Constructs the Microsoft OAuth 2.0 authorization URL
    """
    tenant = os.getenv("MICROSOFT_TENANT_ID", "common")
    client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
    redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback")
    
    base_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": " ".join(MICROSOFT_SCOPES),
    }
    if state:
        params["state"] = state
        
    return f"{base_url}?{urlencode(params)}"

def exchange_microsoft_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchanges authorization code for Microsoft OAuth access token
    """
    tenant = os.getenv("MICROSOFT_TENANT_ID", "common")
    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    
    client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
    client_secret = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback")
    
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    resp = requests.post(token_url, data=data, headers=headers, timeout=10)
    
    if resp.status_code != 200:
        raise Exception(f"Failed to exchange Microsoft code: {resp.status_code} - {resp.text}")
        
    return resp.json()

def get_microsoft_user_info(access_token: str) -> Dict[str, Any]:
    """
    Fetches the authenticated user profile from Microsoft Graph API /me
    """
    graph_url = "https://graph.microsoft.com/v1.0/me"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    resp = requests.get(graph_url, headers=headers, timeout=10)
    if resp.status_code != 200:
        raise Exception(f"Failed to get Microsoft user profile: {resp.status_code} - {resp.text}")
        
    data = resp.json()
    email = data.get("mail") or data.get("userPrincipalName") or ""
    name = data.get("displayName") or (email.split("@")[0] if "@" in email else "Microsoft User")
    
    return {
        "id": data.get("id"),
        "name": name,
        "email": email,
        "givenName": data.get("givenName"),
        "surname": data.get("surname"),
        "jobTitle": data.get("jobTitle", "Hiring Lead"),
        "officeLocation": data.get("officeLocation"),
    }
