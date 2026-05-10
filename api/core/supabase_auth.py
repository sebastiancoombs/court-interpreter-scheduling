"""Supabase JWT verifier for bcgov FastAPI.

Lets a user signed into Supabase Auth (the unified identity layer set up under
``supabase/`` and ``integration/auth-bridge/``) call any FastAPI route in this
backend without re-authenticating. Existing Keycloak / OIDC flow in
``core.JWTtoken`` continues to work alongside this — ``core.auth.verify_user``
tries Supabase first and falls back to the existing flow.

Required env:

    SUPABASE_JWT_SECRET   The HS256 signing key from the Supabase project.
                          Same secret used by ``integration/shared/jwt.ts``.

Optional env:

    SUPABASE_AUDIENCE     Defaults to "authenticated".

The verified JWT payload is mapped to the user dict shape the rest of the
codebase already expects::

    {
        "username": <str>,    # auth.users.email or auth.users.user_metadata.username
        "email":    <str>,
        "user_id":  <uuid>,   # auth.users.id (sub claim)
        "roles":    <list[str]>,  # from app_metadata.roles or app.roles join
        "source":   "supabase",
    }
"""
from __future__ import annotations

import os
from typing import Optional

import jwt  # PyJWT — already a transitive dep via fastapi-users / python-jose


SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_AUDIENCE = os.getenv("SUPABASE_AUDIENCE", "authenticated")


def verify_supabase_jwt(token: str) -> Optional[dict]:
    """Return a user dict if the token is a valid Supabase JWT, else None.

    Returns ``None`` (not an exception) on failure so the caller can
    transparently fall back to the legacy Keycloak/OIDC verifier.
    """
    if not SUPABASE_JWT_SECRET or not token:
        return None

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=SUPABASE_AUDIENCE,
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError:
        return None

    user_metadata = payload.get("user_metadata") or {}
    app_metadata = payload.get("app_metadata") or {}

    email = payload.get("email") or user_metadata.get("email")
    if not email:
        return None

    return {
        "user_id": payload["sub"],
        "email": email,
        "username": user_metadata.get("username") or email,
        "first_name": user_metadata.get("first_name"),
        "last_name": user_metadata.get("last_name"),
        "display_name": user_metadata.get("display_name"),
        "roles": app_metadata.get("roles") or [],
        "source": "supabase",
    }
