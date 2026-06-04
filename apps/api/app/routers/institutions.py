from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import AdminUser
from app.models import Assignment, Institution, Submission, User

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


@router.get("/{institution_id}/analytics")
async def get_institution_analytics(
    institution_id: UUID,
    user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    if user.institution_id and str(institution_id) != user.institution_id:
        raise HTTPException(403, "Access denied")

    teachers = await db.scalar(
        select(func.count()).select_from(User).where(
            User.institution_id == institution_id, User.role == "teacher"
        )
    )
    students = await db.scalar(
        select(func.count()).select_from(User).where(
            User.institution_id == institution_id, User.role == "student"
        )
    )
    assignments = await db.scalar(
        select(func.count()).select_from(Assignment).where(
            Assignment.institution_id == institution_id
        )
    )
    submissions = await db.scalar(
        select(func.count())
        .select_from(Submission)
        .join(Assignment)
        .where(Assignment.institution_id == institution_id, Submission.status == "submitted")
    )

    return {
        "institution_id": str(institution_id),
        "teachers": teachers or 0,
        "students": students or 0,
        "assignments": assignments or 0,
        "submissions": submissions or 0,
    }
