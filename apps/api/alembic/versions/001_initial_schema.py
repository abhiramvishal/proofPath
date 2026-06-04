"""Initial ProofPath schema

Revision ID: 001
Revises:
Create Date: 2026-06-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "institutions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("domain", sa.Text(), unique=True, nullable=False),
        sa.Column("plan", sa.Text(), server_default="free"),
        sa.Column("default_policy", sa.Text(), server_default="grammar"),
        sa.Column("settings", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("clerk_id", sa.Text(), unique=True, nullable=False),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("institutions.id")),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("institutions.id")),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text()),
        sa.Column("word_limit", sa.Integer()),
        sa.Column("deadline", sa.DateTime(timezone=True)),
        sa.Column("ai_policy", sa.Text(), server_default="grammar"),
        sa.Column("ai_config", postgresql.JSONB(), server_default="{}"),
        sa.Column("status", sa.Text(), server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assignments.id")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("content", sa.Text()),
        sa.Column("word_count", sa.Integer()),
        sa.Column("status", sa.Text(), server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("paid", sa.Text(), unique=True),
        sa.Column("paid_hash", sa.Text()),
        sa.Column("paid_signature", sa.Text()),
        sa.Column("authenticity_score", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("submissions.id")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), server_default="{}"),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
    )
    op.create_index("ix_events_submission_id", "events", ["submission_id"])
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("submissions.id"), unique=True),
        sa.Column("signals", postgresql.JSONB(), server_default="{}"),
        sa.Column("narrative", sa.Text()),
        sa.Column("flags", postgresql.JSONB(), server_default="[]"),
        sa.Column("ai_summary", postgresql.JSONB()),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_index("ix_events_submission_id", table_name="events")
    op.drop_table("events")
    op.drop_table("submissions")
    op.drop_table("assignments")
    op.drop_table("users")
    op.drop_table("institutions")
