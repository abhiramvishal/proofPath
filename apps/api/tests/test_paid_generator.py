import re

from app.services.paid_generator import (
    build_submission_payload,
    generate_paid_string,
    hash_payload,
)


def test_paid_string_format():
    paid = generate_paid_string()
    assert re.fullmatch(r"PP-\d{4}-[0-9A-F]{4}-[0-9A-F]{4}-VERIFIED", paid)


def test_paid_string_year_override():
    paid = generate_paid_string(year=2025)
    assert paid.startswith("PP-2025-")


def test_paid_strings_are_unique():
    paids = {generate_paid_string() for _ in range(50)}
    assert len(paids) == 50


def test_hash_payload_deterministic():
    payload = build_submission_payload(
        events=[{"type": "keystroke", "ts": 1000, "sequence": 1}],
        document_content="Hello world",
        ai_log=[],
        session_metadata={"ip_hash": "abc"},
        student_id="student-1",
        assignment_id="assignment-1",
    )
    h1 = hash_payload(payload)
    h2 = hash_payload(payload)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex digest


def test_hash_changes_with_content():
    base = build_submission_payload(
        events=[],
        document_content="Version A",
        ai_log=[],
        session_metadata={},
        student_id="s",
        assignment_id="a",
    )
    modified = {**base, "document_content": "Version B"}
    assert hash_payload(base) != hash_payload(modified)
