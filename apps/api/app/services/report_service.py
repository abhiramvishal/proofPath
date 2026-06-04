"""Orchestrates report generation: signals → flags → narrative → persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import settings
from app.models import Assignment, Event, Report, Submission
from app.services.report_generator import build_ai_summary_from_events, generate_report_narrative
from app.services.flag_detector import detect_flags
from app.services.signal_extractor import compute_authenticity_score, extract_signals

sync_engine = create_engine(settings.database_url_sync)
SyncSession = sessionmaker(sync_engine)


async def build_full_report(
    submission: Submission,
    events: list[Event],
    assignment: Assignment | None,
) -> dict:
    word_count = submission.word_count or 0
    signals = extract_signals(events, word_count)
    flags = detect_flags(events, signals)
    policy = assignment.ai_policy if assignment else "grammar"
    ai_summary = build_ai_summary_from_events(events, policy)
    session_count = len({str(e.session_id) for e in events}) or 1

    narrative, flags, _ = await generate_report_narrative(
        signals=signals,
        flags=flags,
        assignment_meta={
            "title": assignment.title if assignment else "",
            "instructions": assignment.instructions if assignment else None,
            "word_limit": assignment.word_limit if assignment else None,
        },
        ai_summary=ai_summary,
        word_count=word_count,
        session_count=session_count,
    )

    return {
        "signals": signals,
        "narrative": narrative,
        "flags": flags,
        "ai_summary": ai_summary,
        "authenticity_score": compute_authenticity_score(signals),
    }


async def generate_report_async(db: AsyncSession, submission_id: uuid.UUID) -> Report | None:
    submission = await db.get(Submission, submission_id)
    if not submission:
        return None

    events_result = await db.execute(
        select(Event).where(Event.submission_id == submission_id).order_by(Event.ts)
    )
    events = list(events_result.scalars().all())
    assignment = await db.get(Assignment, submission.assignment_id)
    report_data = await build_full_report(submission, events, assignment)

    existing = await db.execute(select(Report).where(Report.submission_id == submission_id))
    row = existing.scalar_one_or_none()
    if row:
        row.signals = report_data["signals"]
        row.narrative = report_data["narrative"]
        row.flags = report_data["flags"]
        row.ai_summary = report_data["ai_summary"]
        await db.flush()
        await db.refresh(row)
        return row

    new_report = Report(
        submission_id=submission.id,
        signals=report_data["signals"],
        narrative=report_data["narrative"],
        flags=report_data["flags"],
        ai_summary=report_data["ai_summary"],
    )
    db.add(new_report)
    await db.flush()
    await db.refresh(new_report)
    return new_report


def generate_report_sync(submission_id: str) -> None:
    import asyncio

    with SyncSession() as db:
        sid = uuid.UUID(submission_id)
        submission = db.get(Submission, sid)
        if not submission:
            return
        events = list(
            db.execute(select(Event).where(Event.submission_id == sid).order_by(Event.ts))
            .scalars()
            .all()
        )
        assignment = db.get(Assignment, submission.assignment_id)
        report_data = asyncio.run(build_full_report(submission, events, assignment))

        existing = db.execute(
            select(Report).where(Report.submission_id == sid)
        ).scalar_one_or_none()
        if existing:
            existing.signals = report_data["signals"]
            existing.narrative = report_data["narrative"]
            existing.flags = report_data["flags"]
            existing.ai_summary = report_data["ai_summary"]
        else:
            db.add(
                Report(
                    submission_id=sid,
                    signals=report_data["signals"],
                    narrative=report_data["narrative"],
                    flags=report_data["flags"],
                    ai_summary=report_data["ai_summary"],
                )
            )
        db.commit()


def enqueue_report_generation(submission_id: str) -> None:
    try:
        from app.tasks.report_tasks import generate_report_task

        generate_report_task.delay(submission_id)
    except Exception:
        generate_report_sync(submission_id)
