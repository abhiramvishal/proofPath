from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, security, AuthUser
from app.schemas import UserResponse, UserSyncRequest
from app.services.user_service import sync_user_from_clerk

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    body: UserSyncRequest,
    user: AuthUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    payload = jwt.get_unverified_claims(credentials.credentials)
    email = payload.get("email") or payload.get("primary_email") or f"{user.clerk_id}@clerk.local"
    name = payload.get("name") or payload.get("full_name")

    metadata = payload.get("public_metadata") or payload.get("metadata") or {}
    role = body.role or metadata.get("role") or user.role or "student"

    db_user = await sync_user_from_clerk(
        db,
        clerk_id=user.clerk_id,
        email=email,
        name=name,
        role=role,
        institution_domain=body.institution_domain or metadata.get("institution_domain"),
    )
    return db_user


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models import User

    result = await db.execute(select(User).where(User.clerk_id == user.clerk_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(404, "User not synced — call POST /api/users/sync first")
    return db_user
