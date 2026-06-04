"""PAID certificate generation — SHA-256 hash + RSA-2048 signature."""

import hashlib
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings


def generate_paid_string(year: int | None = None) -> str:
    y = year or datetime.now(timezone.utc).year
    part = lambda: secrets.token_hex(2).upper()
    return f"PP-{y}-{part()}-{part()}-VERIFIED"


def build_submission_payload(
    events: list[dict],
    document_content: str,
    ai_log: list[dict],
    session_metadata: dict,
    student_id: str,
    assignment_id: str,
) -> dict:
    return {
        "event_log": events,
        "document_content": document_content,
        "ai_interaction_log": ai_log,
        "session_metadata": session_metadata,
        "student_id": student_id,
        "assignment_id": assignment_id,
        "platform_version": settings.platform_version,
    }


def hash_payload(payload: dict) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def sign_hash(hash_hex: str) -> str:
    key_path = Path(settings.paid_signing_key_path)
    if not key_path.exists():
        return "UNSIGNED_DEV_MODE"

    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    private_key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)
    signature = private_key.sign(
        hash_hex.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    import base64

    return base64.b64encode(signature).decode("ascii")


def verify_hash_signature(hash_hex: str, signature: str) -> bool:
    if signature == "UNSIGNED_DEV_MODE":
        return False
    key_path = Path(settings.paid_verification_key_path)
    if not key_path.exists():
        return False

    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    import base64

    public_key = serialization.load_pem_public_key(key_path.read_bytes())
    try:
        public_key.verify(
            base64.b64decode(signature),
            hash_hex.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False
