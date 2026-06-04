from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import StudentUser
from app.models import Assignment, Submission
from app.schemas import AIAssistRequest, AIAssistResponse
from app.services.ai_assistant import generate_assistance
from app.services.ai_policy import assert_mode_allowed, can_insert_text, validate_policy

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/assist", response_model=AIAssistResponse)
async def ai_assist(
    body: AIAssistRequest,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    from app.services.user_service import resolve_user_by_clerk

    assignment_result = await db.execute(
        select(Assignment).where(Assignment.id == body.assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if assignment.status != "published":
        raise HTTPException(403, "Assignment is not published")

    policy = validate_policy(assignment.ai_policy)
    assert_mode_allowed(policy, body.mode)

    sub_result = await db.execute(
        select(Submission).where(Submission.id == body.submission_id)
    )
    submission = sub_result.scalar_one_or_none()
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    if not submission or submission.student_id != db_user.id:
        raise HTTPException(404, "Submission not found")
    if submission.assignment_id != body.assignment_id:
        raise HTTPException(400, "Submission does not belong to this assignment")

    response_text = await generate_assistance(
        policy=policy,
        mode=body.mode,
        query=body.query,
        assignment_title=assignment.title,
        instructions=assignment.instructions,
        document_excerpt=body.document_excerpt,
    )

    return AIAssistResponse(
        response=response_text,
        insert_allowed=can_insert_text(policy) and body.mode != "chat",
        policy_tier=policy,
        mode=body.mode,
    )
