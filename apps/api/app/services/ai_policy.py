"""Server-side AI policy enforcement."""

from fastapi import HTTPException

VALID_POLICIES = frozenset({"locked", "grammar", "outline", "chat", "inline", "full"})

MODE_TO_POLICY: dict[str, frozenset[str]] = {
    "grammar": frozenset({"grammar", "outline", "chat", "inline", "full"}),
    "outline": frozenset({"outline", "chat", "inline", "full"}),
    "chat": frozenset({"chat", "inline", "full"}),
    "inline": frozenset({"inline", "full"}),
}


def validate_policy(tier: str) -> str:
    if tier not in VALID_POLICIES:
        raise HTTPException(400, f"Invalid ai_policy. Must be one of: {', '.join(sorted(VALID_POLICIES))}")
    return tier


def assert_mode_allowed(policy: str, mode: str) -> None:
    if policy == "locked":
        raise HTTPException(403, "AI assistance is disabled for this assignment")
    allowed = MODE_TO_POLICY.get(mode)
    if not allowed or policy not in allowed:
        raise HTTPException(403, f"Mode '{mode}' is not permitted under policy '{policy}'")


def can_insert_text(policy: str) -> bool:
    return policy in ("inline", "full")


def build_system_prompt(
    policy: str,
    assignment_title: str,
    instructions: str | None,
) -> str:
    base = (
        f"You are ProofPath's writing assistant for the assignment: {assignment_title}.\n"
        "Never claim to write the student's work for them. Be calibrated and educational.\n"
    )
    if instructions:
        base += f"\nAssignment instructions:\n{instructions}\n"

    policy_rules = {
        "grammar": (
            "POLICY: Grammar & Spell Only. Only suggest corrections to grammar, spelling, and punctuation. "
            "Do not generate new sentences, paragraphs, or structural content."
        ),
        "outline": (
            "POLICY: Outline Assist. Only provide structural outlines, headings, and bullet points. "
            "Never write full prose paragraphs or complete sentences for the student."
        ),
        "chat": (
            "POLICY: Query Only. Answer questions and explain concepts. "
            "Do not provide text meant to be pasted into the assignment."
        ),
        "inline": (
            "POLICY: Inline Suggestions. Provide short completion suggestions (1-2 sentences max). "
            "Student may insert your suggestions; all interactions are logged."
        ),
        "full": (
            "POLICY: Full Logged. You may help freely but encourage original student work. "
            "All interactions are logged for the authenticity report."
        ),
    }
    return base + "\n" + policy_rules.get(policy, policy_rules["full"])
