from fastapi import APIRouter, Depends, Request, HTTPException, status
from core.multi_database_middleware import get_db_session
from sqlalchemy.orm import Session

from starlette.responses import RedirectResponse
from oidc.openid_connect import OpenIDConnect
from core.utils import getBaseUrl, getLoginUrl, getLogoutUrl

from uuid import uuid4
from core.config import settings
from oidc.oidc_user_repository import oidc_user_repository
from core import JWTtoken

import base64
import hashlib
import jwt
from datetime import datetime
import os
import requests as http_requests
from pydantic import BaseModel

from models.user_model import UserModel
from models.oidc_model import OidcUserModel


hint = settings.OIDC_RP_KC_IDP_HINT
host = settings.OIDC_RP_PROVIDER_URL
realm = settings.OIDC_RP_PROVIDER_REALM
client_id = settings.OIDC_RP_CLIENT_ID
client_secret = settings.OIDC_RP_CLIENT_SECRET

# OpenIDConnect.__init__ fetches /.well-known/openid-configuration over
# the network at import time. On Railway demo deployments there is no
# Keycloak realm to hit, so the request 502s and crashes uvicorn before
# the Supabase login route can serve anything. Defer the failure to the
# OIDC routes that actually need it.
try:
    oidc = OpenIDConnect(hint, host, realm, client_id, client_secret)
except Exception as _oidc_init_err:
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "OIDC init failed (%s); /token/keycloak routes will 503 until reachable", _oidc_init_err)
    oidc = None

import logging
logger = logging.getLogger(__name__)

# # _____________________________
# print("==================")
# print(oidc.issuer)
# print(oidc.authorization_endpoint)
# print(oidc.token_endpoint)
# print(oidc.userinfo_endpoint)
# print(oidc.jwks_uri)
# print(oidc.logout_uri)
# # _____________________________

router = APIRouter(
    prefix="/api/v1",
    tags=['Oidc']
)


_SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
_SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""


class _SupabaseCreds(BaseModel):
    email: str
    password: str


@router.post('/login/supabase')
def supabase_login(creds: _SupabaseCreds, request: Request, db: Session = Depends(get_db_session)):
    if not _SUPABASE_URL or not _SUPABASE_ANON_KEY:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Supabase auth not configured")

    # Exchange email+password for a Supabase JWT
    sb_resp = http_requests.post(
        f"{_SUPABASE_URL}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": _SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": creds.email, "password": creds.password},
        timeout=10,
    )
    if sb_resp.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    sb_data = sb_resp.json()
    supabase_token = sb_data.get("access_token")

    from core.supabase_auth import verify_supabase_jwt
    user_info = verify_supabase_jwt(supabase_token)
    if not user_info:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token verification failed")

    # Look up or create the local bcgov user record by email
    email = user_info["email"]
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        user = UserModel(
            username=email,
            email=email,
            display_name=user_info.get("display_name") or email.split("@")[0],
            first_name=user_info.get("first_name") or "",
            last_name=user_info.get("last_name") or "",
            authorization_id=user_info["user_id"],
            last_login=datetime.now(),
            date_joined=datetime.now(),
            is_staff=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        db.query(UserModel).filter(UserModel.id == user.id).update({"last_login": datetime.now()})
        db.commit()

    # Sync roles from Supabase app_metadata → bcgov role table
    supabase_roles = user_info.get("roles") or []
    if supabase_roles:
        from models.role_model import RoleModel, UserRoleModel
        existing_role_ids = {ur.role_id for ur in db.query(UserRoleModel).filter(UserRoleModel.user_id == user.id).all()}
        for role_name in supabase_roles:
            role = db.query(RoleModel).filter(RoleModel.role_name == role_name).first()
            if role and role.id not in existing_role_ids:
                db.add(UserRoleModel(user_id=user.id, role_id=role.id, updated_by="supabase"))
        db.commit()

    # Store email in session so verify_token works on subsequent calls
    request.session["oidc_user_email"] = email

    access_token = JWTtoken.create_access_token(data={
        "sub": email,
        "username": user.username,
    })

    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        exp_ts = decoded.get("exp")
        expires_at = datetime.utcfromtimestamp(exp_ts).isoformat() if exp_ts else None
    except Exception:
        expires_at = None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "login_url": None,
        "logout_url": getLogoutUrl(request),
        "expires_at": expires_at,
    }


def logout_request(callback_uri, id_token=None):
    logout_url = f"{oidc.logout_uri}?post_logout_redirect_uri={callback_uri}&client_id={client_id}"
    if id_token:
       logout_url += f"&id_token_hint={id_token}"
    return RedirectResponse(logout_url)


@router.get('/login/session/cb')
async def oidc_login_callback(request: Request, db: Session = Depends(get_db_session)):
    
    # print("_________OIDC_CALLBACK____________")
   
    code = request.query_params.get("code")
   
    if ("oidc_auth_state" not in request.session or request.session["oidc_auth_state"] != request.query_params.get("state")):        
        logger.error("______Please remove/clear cookies for this webpage and try again. It's best to open an Incognito/private tab. Error: Invalid OpenID Connect callback state value._____________")
        logout=getLogoutUrl(request)
        return RedirectResponse(logout)
            
    request.session.clear()
    
    callback_uri = f"{getBaseUrl(request)}{request.url.path}"
    auth_result = oidc.authenticate(code, callback_uri, include_user_info=True)
    
    # Store tokens in the session
    request.session["oidc_refresh_token"] = auth_result["refresh_token"]
    request.session["oidc_user_email"] = auth_result["user_info"]["email"]
    request.session["oidc_id_token"] = auth_result["id_token"]  # Store id_token

    # Redirect to frontend route
    if ("x-forwarded-host" not in request.headers 
        and "host" in request.headers
        and "localhost:" in request.headers['host']
    ):
        redirect_url = f"{settings.FRONTEND_HOST_URL}{settings.DEFAULT_BASE_URL}/bookings"
    else:
        redirect_url = f"{getBaseUrl(request)}{settings.DEFAULT_BASE_URL}/bookings"
    
    return RedirectResponse(redirect_url)



@router.get('/login')
def web_login_callback(request: Request):

    callback_uri = f"{getBaseUrl(request)}{request.url.path}"+"/session"

    # _____________________________
    # print("______Clear_Session_____")
    # print(callback_uri)
    id_token = request.session.get("oidc_id_token")  # Retrieve id_token from session
    # logger.info("/login ====> oidc_id_token: %s", id_token)
    request.session["oidc_refresh_token"] = None
    request.session["oidc_auth_state"] = None 
    request.session["oidc_user_email"] = None 
    request.session.clear()
    
    return logout_request(callback_uri, id_token) #RedirectResponse(f"{oidc.logout_uri}?redirect_uri={callback_uri}")



@router.get('/login/session')
def web_login_callback(request: Request):

    callback_uri = f"{getBaseUrl(request)}{request.url.path}"+"/cb"

    # _____________________________
    # print("______Login______")
    # print(callback_uri)

    request.session["oidc_refresh_token"] = None
    request.session["oidc_auth_state"] = None 
    request.session["oidc_user_email"] = None
    request.session.clear()

    session_key = str(uuid4())
    request.session["oidc_auth_state"]=session_key
    login_url = oidc.get_auth_redirect_uri(callback_uri,session_key)
    
    # _____________________________   
    # print("______Login__URL____")    
    # print(login_url)
    # _____________________________

    return RedirectResponse(login_url)



@router.get('/logout')
def web_logout_user(request: Request):
    
    # print("________VOID_THE_TOKEN______")
    request.session["oidc_user_email"] = None 
    request.session["oidc_refresh_token"] = None
    request.session["oidc_auth_state"] = None
    
    id_token = request.session.get("oidc_id_token")  # Retrieve id_token from session
    request.session.clear()
    
    callback_uri = f"{getBaseUrl(request)}{request.url.path}"+"/cb"
    return logout_request(callback_uri, id_token=id_token)  # Pass id_token to logout_request



@router.get('/logout/cb')
def oidc_logout_done(request: Request):
    
    # print("_______LOGGED-OUT_______")
    request.session["oidc_user_email"] = None 
    request.session["oidc_refresh_token"] = None
    request.session["oidc_auth_state"] = None
    request.session.clear()

    if ("x-forwarded-host" not in request.headers 
        and "host" in request.headers
        and "localhost:" in request.headers['host']
    ):
        redirect_url = f"{settings.FRONTEND_HOST_URL}{settings.DEFAULT_BASE_URL}/"
    else:
        redirect_url = f"{getBaseUrl(request)}{settings.DEFAULT_BASE_URL}/"

    return RedirectResponse(redirect_url)



@router.get('/token')
def token_user(request: Request, db: Session = Depends(get_db_session)):
    login_response = {
        "access_token": None,
        "token_type": "bearer",
        "login_url": getLoginUrl(request),
        "logout_url": getLogoutUrl(request),
        "expires_at": None,
        "supabase_enabled": bool(_SUPABASE_URL and _SUPABASE_ANON_KEY),
    }
    
    if("oidc_refresh_token" in request.session and request.session["oidc_refresh_token"] is not None):
        
        oidc_refresh_token = request.session["oidc_refresh_token"]
               
        # print(oidc_refresh_token)

        try:
            response = oidc.get_refresh_token(oidc_refresh_token)
        except:
            return login_response
        
        oidc_userinfo = oidc.get_user_info(response['access_token'])
        # introspection_info = oidc.get_introspection_info(response['access_token'])
        oidc_user_roles = "" #introspection_info['realm_access']['roles']

        # print("________REFRESH__TOKEN__RESPONSE______")
        # print(response)
        # print(oidc_userinfo)        
        # print(oidc_user_roles)
        # _____________________________

        oidc_user = oidc_user_repository(oidc_userinfo, oidc_user_roles, db)
        access_token = JWTtoken.create_access_token(data={
            "sub": oidc_user.user.email,
            "username": oidc_user.user.username
        })

        try:
            decoded_token = jwt.decode(access_token, options={"verify_signature": False})
            exp_timestamp = decoded_token.get("exp")  # Extract the "exp" field
            expires_at = datetime.utcfromtimestamp(exp_timestamp).isoformat() if exp_timestamp else None
        except jwt.DecodeError:
            expires_at = None

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "login_url": None,
            "logout_url": getLogoutUrl(request),
            "expires_at": expires_at,
            "supabase_enabled": bool(_SUPABASE_URL and _SUPABASE_ANON_KEY),
        }
    else:
        return login_response


    
# @router.get('/migrate_sub')
# def migrate_sub(field: str, db: Session = Depends(get_db_session)):
    
#     oidc_users = db.query(OidcUserModel)    
    
#     for usr in oidc_users:

#         guid = usr.userinfo.get(field)
#         if guid:
#             print(guid)
#             guid_hash = base64.urlsafe_b64encode(hashlib.sha1(str.encode(guid)).digest()).rstrip(b'=')
#             user = db.query(UserModel).filter(UserModel.id == usr.user_id)
#             user.update({
#                 "username": guid_hash,
#                 "authorization_id": guid
#             })
#             oidc_user = db.query(OidcUserModel).filter(OidcUserModel.id == usr.id)
#             oidc_user.update({        
#                 "sub": guid
#             })
#             db.commit()