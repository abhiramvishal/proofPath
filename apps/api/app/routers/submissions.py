from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import StudentUser, get_current_user
from app.models import Assignment, Event, Report, Submission
from app.schemas import (
    EventBatchInput,
    ReportResponse,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUpdate,
)
from app.services.paid_generator import (
    build_submission_payload,
    generate_paid_string,
    hash_payload,
    sign_hash,
)
from app.services.active_writers import record_activity
from app.services.report_service import enqueue_report_generation, generate_report_async
from app.services.signal_extractor import compute_authenticity_score, extract_signals

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

AI_EVENT_TYPES = frozenset({"ai_query", "ai_insert"})


from app.services.user_service import resolve_user_by_clerk


async def _get_assignment_policy(db: AsyncSession, submission: Submission) -> str:
    result = await db.execute(
        select(Assignment.ai_policy).where(Assignment.id == submission.assignment_id)
    )
    policy = result.scalar_one_or_none()
    return policy or "locked"


@router.get("/by-assignment/{assignment_id}", response_model=SubmissionResponse | None)
async def get_submission_for_assignment(
    assignment_id: UUID,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    result = await db.execute(
        select(Submission).where(
            Submission.assignment_id == assignment_id,
            Submission.student_id == db_user.id,
        )
    )
    return result.scalar_one_or_none()


@router.post("", response_model=SubmissionResponse)
async def create_submission(
    body: SubmissionCreate,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)

    existing = await db.execute(
        select(Submission).where(
            Submission.assignment_id == body.assignment_id,
            Submission.student_id == db_user.id,
        )
    )
    existing_sub = existing.scalar_one_or_none()
    if existing_sub:
        if body.content is not None:
            existing_sub.content = body.content
            existing_sub.word_count = len(body.content.split())
            await db.flush()
            await db.refresh(existing_sub)
        return existing_sub

    assignment_result = await db.execute(
        select(Assignment).where(Assignment.id == body.assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment or assignment.status != "published":
        raise HTTPException(403, "Assignment is not available for submissions")

    submission = Submission(
        assignment_id=body.assignment_id,
        student_id=db_user.id,
        content=body.content,
        word_count=len(body.content.split()) if body.content else 0,
        status="draft",
    )
    db.add(submission)
    await db.flush()
    await db.refresh(submission)
    return submission


@router.patch("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: UUID,
    body: SubmissionUpdate,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission or submission.student_id != db_user.id:
        raise HTTPException(404, "Submission not found")

    if body.content is not None:
        submission.content = body.content
        submission.word_count = len(body.content.split())
    await db.flush()
    await db.refresh(submission)
    return submission


@router.post("/{submission_id}/events")
async def submit_events(
    submission_id: UUID,
    body: EventBatchInput,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission or submission.student_id != db_user.id:
        raise HTTPException(404, "Submission not found")

    policy = await _get_assignment_policy(db, submission)

    for evt in body.events:
        if evt.type in AI_EVENT_TYPES and policy == "locked":
            raise HTTPException(403, "AI events not allowed under locked policy")
        if evt.type == "ai_insert" and policy in ("locked", "chat", "grammar", "outline"):
            raise HTTPException(403, f"AI insert not allowed under policy '{policy}'")

        db.add(
            Event(
                submission_id=submission_id,
                session_id=body.session_id,
                type=evt.type,
                payload=evt.payload,
                ts=datetime.fromtimestamp(evt.ts / 1000, tz=timezone.utc),
                sequence=evt.sequence,
            )
        )
    await db.flush()

    # Broadcast active-writing status to any connected teacher dashboards
    assignment_result = await db.execute(
        select(Assignment).where(Assignment.id == submission.assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()
    if assignment:
        record_activity(
            assignment_id=str(submission.assignment_id),
            student_id=str(db_user.id),
            student_name=db_user.name or db_user.email,
            word_count=submission.word_count or 0,
        )

    return {"accepted": len(body.events)}


@router.post("/{submission_id}/submit", response_model=SubmissionResponse)
async def finalize_submission(
    submission_id: UUID,
    user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    db_user = await resolve_user_by_clerk(db, user.clerk_id, user.user_id)
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission or submission.student_id != db_user.id:
        raise HTTPException(404, "Submission not found")

    events_result = await db.execute(
        select(Event).where(Event.submission_id == submission_id).order_by(Event.ts)
    )
    events = events_result.scalars().all()
    event_dicts = [
        {
            "type": e.type,
            "ts": e.ts.isoformat(),
            "sequence": e.sequence,
            "payload": e.payload,
        }
        for e in events
    ]

    word_count = submission.word_count or 0
    signals = extract_signals(list(events), word_count)
    score = compute_authenticity_score(signals)

    payload = build_submission_payload(
        events=event_dicts,
        document_content=submission.content or "",
        ai_log=[e for e in event_dicts if e["type"] in ("ai_query", "ai_insert")],
        session_metadata={"device_fingerprint": "web", "session_timestamps": [], "ip_hash": ""},
        student_id=str(submission.student_id),
        assignment_id=str(submission.assignment_id),
    )
    paid_hash = hash_payload(payload)
    paid = generate_paid_string()
    signature = sign_hash(paid_hash)

    submission.status = "submitted"
    submission.submitted_at = datetime.now(timezone.utc)
    submission.paid = paid
    submission.paid_hash = paid_hash
    submission.paid_signature = signature
    submission.authenticity_score = score
    await db.flush()

    enqueue_report_generation(str(submission_id))

    await db.refresh(submission)
    return submission


@router.get("/{submission_id}/report", response_model=ReportResponse)
async def get_report(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Report).where(Report.submission_id == submission_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not yet generated")
    return report


@router.post("/{submission_id}/report/generate", response_model=ReportResponse)
async def trigger_report_generation(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Generate or regenerate authenticity report (async via Celery, sync fallback)."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(404, "Submission not found")
    if submission.status != "submitted":
        raise HTTPException(400, "Report available only for submitted work")

    existing = await db.execute(select(Report).where(Report.submission_id == submission_id))
    if existing.scalar_one_or_none():
        enqueue_report_generation(str(submission_id))
        await db.flush()
        result = await db.execute(select(Report).where(Report.submission_id == submission_id))
        report = result.scalar_one_or_none()
        if report:
            return report

    report = await generate_report_async(db, submission_id)
    if not report:
        raise HTTPException(500, "Report generation failed")
    return report
