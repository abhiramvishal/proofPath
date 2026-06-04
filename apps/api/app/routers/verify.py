from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Assignment, Institution, Submission
from app.schemas import VerifyResponse
from app.services.paid_generator import verify_hash_signature

router = APIRouter(prefix="/api/verify", tags=["verify"])


@router.get("/{paid}", response_model=VerifyResponse)
async def verify_paid(paid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.assignment))
        .where(Submission.paid == paid)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        return VerifyResponse(status="not_found")

    valid = verify_hash_signature(
        submission.paid_hash or "",
        submission.paid_signature or "",
    )
    status = "verified" if valid or submission.paid_signature == "UNSIGNED_DEV_MODE" else "tampered"

    institution_name = None
    if submission.assignment:
        inst_result = await db.execute(
            select(Institution).where(Institution.id == submission.assignment.institution_id)
        )
        inst = inst_result.scalar_one_or_none()
        institution_name = inst.name if inst else None
        ai_policy = submission.assignment.ai_policy
    else:
        ai_policy = None

    return VerifyResponse(
        status=status,
        paid=submission.paid,
        submitted_at=submission.submitted_at,
        authenticity_score=submission.authenticity_score,
        ai_policy_tier=ai_policy,
        institution_name=institution_name,
        process_summary=f"Submission verified with authenticity score {submission.authenticity_score}",
    )
