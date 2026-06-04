"""Claude-powered authenticity report generation — structured JSON output."""

from __future__ import annotations

import json
import re

from app.config import settings

REPORT_SYSTEM_PROMPT = """You are ProofPath's authenticity report engine for higher education.

RULES:
- Never state that a student cheated. Describe writing behaviour only.
- Flag patterns for human review; note ambiguity where evidence is unclear.
- Be calibrated and fair per Australian academic integrity standards.

OUTPUT: Respond with ONLY valid JSON (no markdown fences) matching this schema:
{
  "narrative": "2-4 paragraph writing journey summary (Section B)",
  "flags": [
    {"code": "string", "message": "string", "severity": "info|warning|critical", "timestamp": "optional ISO"}
  ],
  "interpretations": {
    "signal_key": "one sentence interpretation"
  }
}

You may add to the provided flags array but do not remove critical flags.
Keep narrative under 400 words."""


def _parse_claude_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _build_ai_summary(events: list, policy: str) -> dict | None:
    ai_events = [e for e in events if getattr(e, "type", e.get("type")) in ("ai_query", "ai_insert")]
    if not ai_events and policy == "locked":
        return None

    queries = [e for e in ai_events if (getattr(e, "type", None) or e.get("type")) == "ai_query"]
    inserts = [e for e in ai_events if (getattr(e, "type", None) or e.get("type")) == "ai_insert"]

    def _payload(ev):
        return ev.payload if hasattr(ev, "payload") else ev.get("payload", {})

    chars_offered = sum((_payload(e).get("chars_offered") or 0) for e in inserts)
    chars_inserted = sum((_payload(e).get("chars_inserted") or 0) for e in inserts)

    return {
        "policy_tier": policy,
        "interaction_count": len(ai_events),
        "query_count": len(queries),
        "insert_count": len(inserts),
        "chars_offered": chars_offered,
        "chars_inserted": chars_inserted,
        "chars_inserted_from_ai": chars_inserted,
    }


def build_ai_summary_from_events(events: list, policy: str) -> dict | None:
    return _build_ai_summary(events, policy)


async def generate_report_narrative(
    signals: dict[str, int],
    flags: list[dict],
    assignment_meta: dict,
    ai_summary: dict | None,
    word_count: int = 0,
    session_count: int = 1,
) -> tuple[str, list[dict], dict]:
    """Returns narrative, merged flags, and signal interpretations."""

    score = int(sum(signals.values()) / len(signals)) if signals else 50

    if not settings.anthropic_api_key:
        narrative = _dev_narrative(signals, flags, assignment_meta, word_count, session_count, score)
        return narrative, flags, {}

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        user_content = json.dumps(
            {
                "authenticity_score": score,
                "signals": signals,
                "flags": flags,
                "assignment": assignment_meta,
                "ai_summary": ai_summary,
                "word_count": word_count,
                "session_count": session_count,
            },
            indent=2,
        )
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=REPORT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        text = message.content[0].text
        parsed = _parse_claude_json(text)
        narrative = parsed.get("narrative", text)
        merged_flags = _merge_flags(flags, parsed.get("flags", []))
        interpretations = parsed.get("interpretations", {})
        return narrative, merged_flags, interpretations
    except Exception:
        narrative = _dev_narrative(signals, flags, assignment_meta, word_count, session_count, score)
        return narrative, flags, {}


def _merge_flags(existing: list[dict], from_claude: list[dict]) -> list[dict]:
    seen = {f.get("code") for f in existing}
    merged = list(existing)
    for f in from_claude:
        if f.get("code") not in seen:
            merged.append(f)
            seen.add(f.get("code"))
    return merged


def _dev_narrative(
    signals: dict[str, int],
    flags: list[dict],
    assignment_meta: dict,
    word_count: int,
    session_count: int,
    score: int,
) -> str:
    title = assignment_meta.get("title", "the assignment")
    flag_note = (
        f" {len(flags)} pattern(s) were flagged for teacher review."
        if flags
        else " No significant flags were detected."
    )
    return (
        f"Writing journey for {title}: the student worked across {session_count} session(s) "
        f"producing approximately {word_count} words. "
        f"The composite authenticity score is {score}/100, derived from {len(signals)} behavioural signals "
        f"including typing consistency, pause patterns, paste ratio, and AI interaction metadata."
        f"{flag_note} "
        "Connect ANTHROPIC_API_KEY for AI-generated narrative detail."
    )
