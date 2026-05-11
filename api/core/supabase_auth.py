"""Supabase JWT verifier for bcgov FastAPI.

Lets a user signed into Supabase Auth (the unified identity layer set up under
``supabase/`` and ``integration/auth-bridge/``) call any FastAPI route in this
backend without re-authenticating. Existing Keycloak / OIDC flow in
``core.JWTtoken`` continues to work alongside this — ``core.auth.verify_user``
tries Supabase first and falls back to the existing flow.

Modern Supabase projects (created 2024+) sign JWTs **asymmetrically**
(ES256 / RS256) and expose a JWKS endpoint with the public key — there is
no shared symmetric secret to paste into env. Legacy projects still use
HS256 with a shared secret. The verifier supports both:

  - If ``SUPABASE_JWKS_URL`` is set (or derivable from ``SUPABASE_URL``),
    fetch the signing key set and verify asymmetrically.
  - Otherwise fall back to HS256 with ``SUPABASE_JWT_SECRET``.

The verified JWT payload is mapped to the user dict shape the rest of the
codebase already expects::

    {
        "username": <str>,    # email or user_metadata.username
        "email":    <str>,
        "user_id":  <uuid>,   # auth.users.id (sub claim)
        "roles":    <list[str]>,  # from app_metadata.roles
        "source":   "supabase",
    }
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import jwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Env-driven config. Read once at import time.
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL") or (
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None
)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_AUDIENCE = os.getenv("SUPABASE_AUDIENCE", "authenticated")

_jwks_client: Optional[PyJWKClient] = None


def _resolve_signing_key(token: str):
    """Pull the public key for this token from the JWKS endpoint.

    PyJWKClient caches the key set so we only refetch when the kid rotates.
    """
    global _jwks_client
    if _jwks_client is None:
        if not SUPABASE_JWKS_URL:
            return None
        _jwks_client = PyJWKClient(SUPABASE_JWKS_URL)
    try:
        return _jwks_client.get_signing_key_from_jwt(token).key
    except jwt.PyJWKClientError as e:
        logger.debug("JWKS lookup failed: %s", e)
        return None


def verify_supabase_jwt(token: str) -> Optional[dict]:
    """Return a user dict if the token verifies, else None.

    Returns ``None`` (not an exception) on failure so the caller can
    transparently fall back to the legacy Keycloak/OIDC verifier.
    """
    if not token:
        return None

    payload = None
    try:
        if SUPABASE_JWKS_URL:
            # Asymmetric path — modern Supabase projects.
            key = _resolve_signing_key(token)
            if key is None:
                return None
            payload = jwt.decode(
                token,
                key,
                algorithms=["ES256", "RS256"],
                audience=SUPABASE_AUDIENCE,
                options={"require": ["sub", "exp"]},
            )
        elif SUPABASE_JWT_SECRET:
            # Legacy HS256 — older Supabase projects or self-signed test JWTs.
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=SUPABASE_AUDIENCE,
                options={"require": ["sub", "exp"]},
            )
        else:
            return None
    except jwt.PyJWTError as e:
        logger.debug("Supabase JWT verification failed: %s", e)
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
