import os
import re
import json
import base64
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
from typing import Optional, Dict, Any, Tuple

from oauth.google_oauth import get_google_auth_url, exchange_code_for_token, get_google_user_info
from oauth.microsoft_oauth import (
    get_microsoft_auth_url,
    exchange_microsoft_code_for_token,
    get_microsoft_user_info,
    is_microsoft_configured,
)
from oauth.slack_oauth import (
    get_slack_auth_url,
    exchange_slack_code_for_token,
    get_slack_user_info,
    is_slack_configured,
)

router = APIRouter(prefix="/auth", tags=["Authentication & SSO"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def decode_id_token_payload(id_token: str) -> Dict[str, Any]:
    """Decodes JWT payload without verifying signature (for extracting user claims)"""
    try:
        parts = id_token.split(".")
        if len(parts) >= 2:
            payload = parts[1]
            payload += "=" * ((4 - len(payload) % 4) % 4)
            decoded = base64.urlsafe_b64decode(payload.encode("utf-8"))
            return json.loads(decoded.decode("utf-8"))
    except Exception as e:
        print("Could not decode id_token:", e)
    return {}

@router.get("/providers")
def get_auth_providers():
    """Returns the configuration status of SSO providers"""
    return {
        "google": True,
        "microsoft": is_microsoft_configured(),
        "microsoft_tenant": os.getenv("MICROSOFT_TENANT_ID", "common"),
        "microsoft_client_id_configured": bool(os.getenv("MICROSOFT_CLIENT_ID") and not os.getenv("MICROSOFT_CLIENT_ID", "").startswith("your-")),
        "slack": is_slack_configured(),
        "slack_client_id_configured": bool(os.getenv("SLACK_CLIENT_ID") and not os.getenv("SLACK_CLIENT_ID", "").startswith("your-")),
    }

# -------------------------------------------------------------------
# Google OAuth 2.0
# -------------------------------------------------------------------
@router.get("/google/login")
def google_login_redirect():
    """Redirects the user directly to Google OAuth consent screen"""
    auth_url = get_google_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/google/url")
def get_auth_url(state: Optional[str] = None):
    url = get_google_auth_url(state)
    return {"authorization_url": url}

@router.get("/google/callback")
def google_oauth_callback(code: str = Query(...), state: Optional[str] = None):
    """
    Receives code from Google, exchanges for tokens, fetches user profile,
    and redirects user to frontend with tokens and user info
    """
    try:
        tokens = exchange_code_for_token(code)
        access_token = tokens.get("access_token", "")
        id_token = tokens.get("id_token", "")

        user_info = {}
        try:
            user_info = get_google_user_info(access_token)
        except Exception as e:
            print("Google userinfo endpoint warning:", e)

        # Fallback to id_token claims if user_info failed or is missing email
        if not user_info.get("email") and id_token:
            jwt_data = decode_id_token_payload(id_token)
            if jwt_data:
                user_info["email"] = jwt_data.get("email", "")
                user_info["name"] = jwt_data.get("name", "")
                user_info["picture"] = jwt_data.get("picture", "")

        email = user_info.get("email") or "google.user@company.com"
        name = user_info.get("name") or (email.split("@")[0] if "@" in email else "Google User")
        initial = (name or email or "G").strip()[:1].upper()
        avatar = f"https://ui-avatars.com/api/?name={initial}&background=10b981&color=fff&size=256&bold=true"

        # Build redirect query string back to frontend
        query_params = {
            "auth_token": access_token,
            "user_email": email,
            "user_name": name,
            "user_avatar": avatar,
            "provider": "google",
        }
        redirect_url = f"{FRONTEND_URL}/?{urlencode(query_params)}"
        return RedirectResponse(url=redirect_url)
    except Exception as exc:
        print("Google OAuth callback error:", exc)
        err_params = {"auth_error": str(exc), "provider": "google"}
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode(err_params)}")

# -------------------------------------------------------------------
# Microsoft 365 / Azure AD OAuth
# -------------------------------------------------------------------
@router.get("/microsoft/login")
def microsoft_login_redirect():
    """Redirects the user to Microsoft OAuth 2.0 consent screen"""
    if not is_microsoft_configured():
        # If credentials not set yet, redirect with friendly notification
        err_params = {
            "microsoft_pending_config": "true",
            "message": "Microsoft Tenant & Client ID are pending in backend/.env. You can provide them later or test with demo mode.",
        }
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode(err_params)}")

    auth_url = get_microsoft_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/microsoft/url")
def get_microsoft_url(state: Optional[str] = None):
    url = get_microsoft_auth_url(state)
    return {"authorization_url": url, "configured": is_microsoft_configured()}

@router.get("/microsoft/callback")
def microsoft_oauth_callback(code: str = Query(None), state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """
    Receives code from Microsoft Azure AD, exchanges for Graph access tokens,
    fetches user profile from /me, and redirects to frontend
    """
    if error:
        err_msg = error_description or error
        print("Microsoft OAuth error returned:", err_msg)
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode({'auth_error': err_msg, 'provider': 'microsoft'})}")

    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode({'auth_error': 'No code received from Microsoft', 'provider': 'microsoft'})}")

    try:
        tokens = exchange_microsoft_code_for_token(code)
        access_token = tokens.get("access_token", "")
        id_token = tokens.get("id_token", "")

        user_info = {}
        try:
            user_info = get_microsoft_user_info(access_token)
        except Exception as e:
            print("Microsoft Graph profile warning:", e)

        if not user_info.get("email") and id_token:
            jwt_data = decode_id_token_payload(id_token)
            if jwt_data:
                user_info["email"] = jwt_data.get("preferred_username") or jwt_data.get("email") or ""
                user_info["name"] = jwt_data.get("name", "")

        email = user_info.get("email") or "microsoft.user@organization.com"
        name = user_info.get("name") or (email.split("@")[0] if "@" in email else "Microsoft User")
        initial = (name or email or "M").strip()[:1].upper()
        avatar = f"https://ui-avatars.com/api/?name={initial}&background=0078d4&color=fff&size=256&bold=true"

        query_params = {
            "auth_token": access_token,
            "user_email": email,
            "user_name": name,
            "user_avatar": avatar,
            "provider": "microsoft",
        }
        redirect_url = f"{FRONTEND_URL}/?{urlencode(query_params)}"
        return RedirectResponse(url=redirect_url)
    except Exception as exc:
        print("Microsoft OAuth callback error:", exc)
        err_params = {"auth_error": str(exc), "provider": "microsoft"}
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode(err_params)}")

# -------------------------------------------------------------------
# Slack OAuth 2.0 (Sign in with Slack)
# -------------------------------------------------------------------
@router.get("/slack/login")
def slack_login_redirect():
    """Redirects user to Slack OAuth consent or returns demo flow if credentials pending"""
    if not is_slack_configured():
        demo_params = {
            "slack_pending_config": "1",
            "provider": "slack",
            "user_name": "Slack Workspace Lead",
            "user_email": "recruiter@slack-workspace.com",
            "auth_token": "demo-slack-token-12345",
        }
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode(demo_params)}")

    auth_url = get_slack_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/slack/callback")
def slack_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = None
):
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode({'auth_error': error, 'provider': 'slack'})}")

    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode({'auth_error': 'No code received from Slack', 'provider': 'slack'})}")

    try:
        tokens = exchange_slack_code_for_token(code)
        access_token = tokens.get("access_token", "")
        id_token = tokens.get("id_token", "")

        user_info = {}
        try:
            user_info = get_slack_user_info(access_token)
        except Exception as e:
            print("Slack user info warning:", e)

        if not user_info.get("email") and id_token:
            jwt_data = decode_id_token_payload(id_token)
            if jwt_data:
                user_info["email"] = jwt_data.get("email", "")
                user_info["name"] = jwt_data.get("name", "")
                user_info["picture"] = jwt_data.get("picture", "")

        email = user_info.get("email") or "slack.user@company.com"
        name = user_info.get("name") or (email.split("@")[0] if "@" in email else "Slack User")
        initial = (name or email or "S").strip()[:1].upper()
        avatar = f"https://ui-avatars.com/api/?name={initial}&background=4a154b&color=fff&size=256&bold=true"

        query_params = {
            "auth_token": access_token,
            "user_email": email,
            "user_name": name,
            "user_avatar": avatar,
            "provider": "slack",
        }
        redirect_url = f"{FRONTEND_URL}/?{urlencode(query_params)}"
        return RedirectResponse(url=redirect_url)
    except Exception as exc:
        print("Slack OAuth callback error:", exc)
        err_params = {"auth_error": str(exc), "provider": "slack"}
        return RedirectResponse(url=f"{FRONTEND_URL}/?{urlencode(err_params)}")

# -------------------------------------------------------------------
# Profile Endpoint
# -------------------------------------------------------------------
@router.get("/me")
def get_current_user_profile(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        user_info = get_google_user_info(token)
        return user_info
    except Exception:
        try:
            user_info = get_microsoft_user_info(token)
            return user_info
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"User profile error: {str(exc)}")

def format_human_name(email: str) -> str:
    """Formats an email like 'alex.sample@example.com' or 'john.doe@company.com' into 'Alex Sample' or 'John Doe'"""
    username = email.split("@")[0].strip()
    if "." in username:
        parts = [p.capitalize() for p in username.split(".") if p]
        return " ".join(parts)
    elif "_" in username:
        parts = [p.capitalize() for p in username.split("_") if p]
        return " ".join(parts)
    return username.capitalize()

def split_name_and_role(raw_name: str) -> Tuple[str, str]:
    """
    Extracts clean name and role/position if Microsoft/Google displayName contains embedded designation.
    Examples:
      'ALEX M - LEAD CONSULTANT'     -> ('Alex M', 'Lead Consultant')
      'Arun K (Principal Architect)' -> ('Arun K', 'Principal Architect')
      'David Miller | Lead Engineer' -> ('David Miller', 'Lead Engineer')
    """
    if not raw_name:
        return "", ""

    # Check for dash / hyphen / en-dash / em-dash / pipe separators
    sep_match = re.split(r'\s+[-–—|]\s+', raw_name, maxsplit=1)
    if len(sep_match) == 2:
        name_part = sep_match[0].strip()
        role_part = sep_match[1].strip()
        if role_part.isupper() and len(role_part) > 3:
            role_part = role_part.title()
        if name_part.isupper() and len(name_part) > 3:
            name_part = name_part.title()
        return name_part, role_part

    # Check for parentheses: Name (Role)
    paren_match = re.match(r'^(.*?)\s*\((.*?)\)$', raw_name)
    if paren_match:
        name_part = paren_match.group(1).strip()
        role_part = paren_match.group(2).strip()
        if role_part.isupper() and len(role_part) > 3:
            role_part = role_part.title()
        if name_part.isupper() and len(name_part) > 3:
            name_part = name_part.title()
        return name_part, role_part

    return raw_name, ""

@router.get("/lookup")
def lookup_account_profile(
    email: str = Query(..., description="Account email to resolve profile for"),
    authorization: Optional[str] = Header(None)
):
    """
    Resolves real user name, role/position (jobTitle), department, and profile picture
    for the account email from Microsoft Graph or Google Workspace Directory.
    """
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Valid email address is required")

    resolved_name = format_human_name(clean_email)
    role = ""
    department = ""

    # Try Microsoft Graph lookup if Bearer token provided
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            import requests

            # 1. Try direct user lookup in Microsoft Graph
            graph_url = f"https://graph.microsoft.com/v1.0/users/{clean_email}?$select=displayName,mail,userPrincipalName,jobTitle,department,officeLocation,id"
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            resp = requests.get(graph_url, headers=headers, timeout=5)

            if resp.status_code == 200:
                data = resp.json()
                resolved_name = data.get("displayName") or resolved_name
                role = data.get("jobTitle") or data.get("role") or role
                department = data.get("department") or department
            elif resp.status_code in (401, 403, 404):
                # 2. Try /me if email matches current signed-in Microsoft account
                me_resp = requests.get("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,jobTitle,department", headers=headers, timeout=5)
                if me_resp.status_code == 200:
                    me_data = me_resp.json()
                    me_mail = (me_data.get("mail") or me_data.get("userPrincipalName") or "").lower()
                    if me_mail == clean_email or clean_email in me_mail:
                        resolved_name = me_data.get("displayName") or resolved_name
                        role = me_data.get("jobTitle") or role
                        department = me_data.get("department") or department
                    elif not role:
                        # 3. Try directory search filter
                        filter_url = f"https://graph.microsoft.com/v1.0/users?$filter=mail eq '{clean_email}' or userPrincipalName eq '{clean_email}'&$select=displayName,jobTitle,department"
                        search_resp = requests.get(filter_url, headers=headers, timeout=5)
                        if search_resp.status_code == 200:
                            search_data = search_resp.json()
                            users = search_data.get("value", [])
                            if users:
                                u = users[0]
                                resolved_name = u.get("displayName") or resolved_name
                                role = u.get("jobTitle") or role
                                department = u.get("department") or department
        except Exception as ms_err:
            print("Microsoft Graph user lookup notice:", ms_err)

        # Try Google People/UserInfo API if token didn't match Microsoft
        if not role:
            try:
                import requests
                google_headers = {"Authorization": f"Bearer {token}"}
                # Try Google People API
                people_url = "https://people.googleapis.com/v1/people/me?personFields=names,organizations,emailAddresses"
                g_resp = requests.get(people_url, headers=google_headers, timeout=5)
                if g_resp.status_code == 200:
                    g_data = g_resp.json()
                    orgs = g_data.get("organizations", [])
                    if orgs:
                        role = orgs[0].get("title") or role
                        department = orgs[0].get("department") or department
                    names = g_data.get("names", [])
                    if names:
                        resolved_name = names[0].get("displayName") or resolved_name
            except Exception as g_err:
                print("Google directory lookup notice:", g_err)

    # If displayName contains an embedded designation (e.g. "Alex M - Lead Consultant"),
    # clean the name and populate role
    clean_name, extracted_role = split_name_and_role(resolved_name)
    if clean_name:
        resolved_name = clean_name
    if not role and extracted_role:
        role = extracted_role

    # Distinct avatar palette based on name hash
    colors = ["6366f1", "10b981", "0ea5e9", "8b5cf6", "ec4899", "f59e0b", "14b8a6"]
    color_idx = sum(ord(c) for c in clean_email) % len(colors)
    bg_color = colors[color_idx]
    avatar_url = f"https://ui-avatars.com/api/?name={resolved_name.replace(' ', '+')}&background={bg_color}&color=fff&size=256&bold=true"

    return {
        "email": clean_email,
        "name": resolved_name,
        "role": role,
        "jobTitle": role,
        "department": department,
        "avatar": avatar_url,
    }
