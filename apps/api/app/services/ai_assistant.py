"""Governed Claude assistance during writing sessions."""

from app.config import settings
from app.services.ai_policy import build_system_prompt


async def generate_assistance(
    *,
    policy: str,
    mode: str,
    query: str,
    assignment_title: str,
    instructions: str | None,
    document_excerpt: str | None = None,
) -> str:
    system = build_system_prompt(policy, assignment_title, instructions)

    user_parts = [query]
    if document_excerpt:
        user_parts.append(f"\n\nCurrent document excerpt:\n{document_excerpt[:2000]}")

    user_content = "\n".join(user_parts)

    if not settings.anthropic_api_key:
        return (
            f"[Dev mode — set ANTHROPIC_API_KEY] Policy: {policy}, mode: {mode}\n\n"
            f"Your query was received ({len(query)} chars). "
            "Connect Anthropic for live responses."
        )

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    return message.content[0].text
