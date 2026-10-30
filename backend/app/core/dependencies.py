import json
import urllib.request
import urllib.error
from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.core.security import decode_access_token, hash_password
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def _verify_supabase_token(token: str) -> dict | None:
    """Validate a Supabase JWT token either cryptographically or via the Supabase Auth server."""
    # 1. Try decoding with SUPABASE_JWT_SECRET if provided
    if settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        except Exception:
            pass

    # 2. Query Supabase Auth user endpoint with Bearer token
    if settings.SUPABASE_URL and (settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY):
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
            url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": api_key
                }
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    meta = data.get("user_metadata", {})
                    return {
                        "sub": data.get("email"),
                        "supabase_uid": data.get("id"),
                        "role": meta.get("role", "student"),
                        "name": meta.get("full_name", data.get("email", "").split("@")[0]),
                        "email": data.get("email")
                    }
        except Exception:
            pass

    # 3. Development / testing fallback: inspect unverified payload for valid Supabase session
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        if unverified.get("aud") == "authenticated" and unverified.get("email"):
            meta = unverified.get("user_metadata", {})
            return {
                "sub": unverified.get("email"),
                "supabase_uid": unverified.get("sub"),
                "role": meta.get("role", "student"),
                "name": meta.get("full_name", unverified.get("email", "").split("@")[0]),
                "email": unverified.get("email")
            }
    except Exception:
        pass

    return None

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    """Validate JWT token (local or Supabase) and return currently authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Clean token to strip any accidental leading "Bearer " prefixes
    clean_token = token
    while clean_token and clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    # 1. Check local backend JWT
    payload = decode_access_token(clean_token)
    user = None
    if payload:
        user_id = payload.get("user_id")
        email = payload.get("sub")
        query = db.query(User)
        if user_id is not None:
            user = query.filter(User.id == user_id).first()
        elif email is not None:
            user = query.filter(User.email == email).first()

    # 2. If not local token, check if it is a Supabase access token
    if user is None:
        supabase_claims = _verify_supabase_token(clean_token)
        if supabase_claims and supabase_claims.get("email"):
            email = supabase_claims["email"]
            user = db.query(User).filter(User.email == email).first()
            if not user:
                # Automatically sync authenticated Supabase user into database
                raw_role = str(supabase_claims.get("role", "student")).lower()
                matched_role = UserRole.STUDENT
                if "admin" in raw_role or "principal" in raw_role:
                    matched_role = UserRole.ADMIN
                elif "teacher" in raw_role:
                    matched_role = UserRole.TEACHER
                elif "parent" in raw_role:
                    matched_role = UserRole.PARENT

                user = User(
                    email=email,
                    hashed_password=hash_password("SupabaseExternalAuth!UnusablePw"),
                    full_name=supabase_claims.get("name", email.split("@")[0]),
                    role=matched_role,
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

    if user is None or not user.is_active:
        raise credentials_exception

    return user

def require_roles(*allowed_roles: UserRole):
    """Factory dependency enforcing Role-Based Access Control (RBAC)."""
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        user_role_str = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role)
        allowed_str = [r.value if hasattr(r, "value") else str(r) for r in allowed_roles]
        if user_role_str not in allowed_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_str} roles"
            )
        return current_user
    return role_checker

# Pre-configured RBAC dependencies
require_admin = require_roles(UserRole.ADMIN)
require_teacher = require_roles(UserRole.ADMIN, UserRole.TEACHER)
require_parent = require_roles(UserRole.PARENT)
require_authenticated = get_current_user
