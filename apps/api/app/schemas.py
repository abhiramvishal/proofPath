from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AssignmentCreate(BaseModel):
    title: str
    instructions: str | None = None
    word_limit: int | None = None
    deadline: datetime | None = None
    ai_policy: str = "grammar"
    ai_config: dict = Field(default_factory=dict)


class AssignmentResponse(BaseModel):
    id: UUID
    teacher_id: UUID
    institution_id: UUID
    title: str
    instructions: str | None
    word_limit: int | None
    deadline: datetime | None
    ai_policy: str
    ai_config: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionCreate(BaseModel):
    assignment_id: UUID
    content: str | None = None


class SubmissionUpdate(BaseModel):
    content: str | None = None


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    content: str | None
    word_count: int | None
    status: str
    submitted_at: datetime | None
    paid: str | None
    authenticity_score: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WritingEventInput(BaseModel):
    type: str
    ts: int
    sequence: int
    payload: dict = Field(default_factory=dict)


class EventBatchInput(BaseModel):
    submission_id: UUID
    session_id: UUID
    events: list[WritingEventInput]


class ReportResponse(BaseModel):
    id: UUID
    submission_id: UUID
    signals: dict
    narrative: str | None
    flags: list
    ai_summary: dict | None
    generated_at: datetime

    model_config = {"from_attributes": True}


class VerifyResponse(BaseModel):
    status: str
    paid: str | None = None
    submitted_at: datetime | None = None
    authenticity_score: int | None = None
    ai_policy_tier: str | None = None
    institution_name: str | None = None
    process_summary: str | None = None


class ClassDashboardEntry(BaseModel):
    student_id: UUID
    student_name: str
    submission_id: UUID | None
    status: str
    authenticity_score: int | None
    triage: str | None
    submitted_at: datetime | None


class AssignmentUpdate(BaseModel):
    title: str | None = None
    instructions: str | None = None
    word_limit: int | None = None
    deadline: datetime | None = None
    ai_policy: str | None = None
    ai_config: dict | None = None
    status: str | None = None


class AssignmentListItem(BaseModel):
    id: UUID
    title: str
    ai_policy: str
    status: str
    deadline: datetime | None
    word_limit: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSyncRequest(BaseModel):
    role: str | None = None
    institution_domain: str | None = None


class UserResponse(BaseModel):
    id: UUID
    clerk_id: str
    institution_id: UUID | None
    role: str
    email: str
    name: str | None

    model_config = {"from_attributes": True}


class AIAssistRequest(BaseModel):
    assignment_id: UUID
    submission_id: UUID
    mode: str  # grammar | outline | chat | inline
    query: str
    document_excerpt: str | None = None


class AIAssistResponse(BaseModel):
    response: str
    insert_allowed: bool
    policy_tier: str
    mode: str
