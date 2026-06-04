from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    clerk_id: str
    role: str = "student"
    user_id: str | None = None
    institution_id: str | None = None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")

    token = credentials.credentials
    try:
        # Clerk JWT — configure issuer/audience in production
        payload = jwt.get_unverified_claims(token)
        clerk_id = payload.get("sub") or payload.get("user_id")
        if not clerk_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        metadata = payload.get("public_metadata") or payload.get("metadata") or {}
        return AuthUser(
            clerk_id=clerk_id,
            role=metadata.get("role", "student"),
            user_id=metadata.get("proofpath_user_id"),
            institution_id=metadata.get("institution_id"),
        )
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e


def require_role(*roles: str):
    async def checker(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


TeacherUser = Annotated[AuthUser, Depends(require_role("teacher", "admin"))]
StudentUser = Annotated[AuthUser, Depends(require_role("student"))]
AdminUser = Annotated[AuthUser, Depends(require_role("admin"))]
