from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import AuthUser, StudentUser, TeacherUser, get_current_user
from app.models import Assignment, Submission, User
from app.schemas import (
    AssignmentCreate,
    AssignmentListItem,
    AssignmentResponse,
    AssignmentUpdate,
    ClassDashboardEntry,
)
from app.services.ai_policy import validate_policy
from app.services.signal_extractor import triage_from_score
router = APIRouter(prefix="/api/assignments", tags=["assignments"])


from app.services.user_service import resolve_user_by_clerk


@router.get("", response_model=list[AssignmentListItem])
async def list_assignments(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.clerk_id == user.clerk_id))
    db_user = user_result.scalar_one_or_none()
    if not db_user:
        return []

    if db_user.role in ("teacher", "admin"):
        result = await db.execute(
            select(Assignment)
            .where(Assignment.teacher_id == db_user.id)
            .order_by(Assignment.created_at.desc())
        )
    else:
        result = await db.execute(
            select(Assignment)
            .where(
                Assignment.institution_id == db_user.institution_id,
                Assignment.status == "published",
            )
            .order_by(Assignment.deadline.asc().nullslast())
        )
    return result.scalars().all()


@router.post("", response_model=AssignmentResponse)
async def create_assignment(
    body: AssignmentCreate,
    user: TeacherUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    policy = validate_policy(body.ai_policy)

    assignment = Assignment(
        teacher_id=db_user.id,
        institution_id=db_user.institution_id,
        title=body.title,
        instructions=body.instructions,
        word_limit=body.word_limit,
        deadline=body.deadline,
        ai_policy=policy,
        ai_config=body.ai_config,
        status="draft",
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    db_user_result = await db.execute(select(User).where(User.clerk_id == user.clerk_id))
    db_user = db_user_result.scalar_one_or_none()

    if db_user and db_user.role == "student" and assignment.status != "published":
        raise HTTPException(403, "Assignment is not available")

    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    body: AssignmentUpdate,
    user: TeacherUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if assignment.teacher_id != db_user.id and db_user.role != "admin":
        raise HTTPException(403, "Not your assignment")

    if body.title is not None:
        assignment.title = body.title
    if body.instructions is not None:
        assignment.instructions = body.instructions
    if body.word_limit is not None:
        assignment.word_limit = body.word_limit
    if body.deadline is not None:
        assignment.deadline = body.deadline
    if body.ai_policy is not None:
        assignment.ai_policy = validate_policy(body.ai_policy)
    if body.ai_config is not None:
        assignment.ai_config = body.ai_config
    if body.status is not None:
        if body.status not in ("draft", "published", "closed"):
            raise HTTPException(400, "Invalid status")
        assignment.status = body.status

    await db.flush()
    await db.refresh(assignment)
    return assignment


@router.get("/{assignment_id}/class", response_model=list[ClassDashboardEntry])
async def get_class_dashboard(
    assignment_id: UUID,
    user: TeacherUser,
    db: AsyncSession = Depends(get_db),
):
    subs = await db.execute(
        select(Submission, User)
        .join(User, Submission.student_id == User.id)
        .where(Submission.assignment_id == assignment_id)
    )
    entries = []
    for submission, student in subs.all():
        score = submission.authenticity_score
        triage = triage_from_score(score) if score is not None else None
        entries.append(
            ClassDashboardEntry(
                student_id=student.id,
                student_name=student.name or student.email,
                submission_id=submission.id,
                status=submission.status,
                authenticity_score=score,
                triage=triage,
                submitted_at=submission.submitted_at,
            )
        )
    return entries
