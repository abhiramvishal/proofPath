import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Institution, User


async def get_or_create_institution(
    db: AsyncSession,
    domain: str = "demo.proofpath.edu.au",
    name: str = "ProofPath Demo University",
) -> Institution:
    result = await db.execute(select(Institution).where(Institution.domain == domain))
    inst = result.scalar_one_or_none()
    if inst:
        return inst
    inst = Institution(
        name=name,
        domain=domain,
        plan="pro",
        default_policy="grammar",
        settings={},
    )
    db.add(inst)
    await db.flush()
    return inst


async def sync_user_from_clerk(
    db: AsyncSession,
    *,
    clerk_id: str,
    email: str,
    name: str | None,
    role: str,
    institution_id: uuid.UUID | None = None,
    institution_domain: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        if name and not user.name:
            user.name = name
        return user

    if institution_id:
        inst_result = await db.execute(
            select(Institution).where(Institution.id == institution_id)
        )
        institution = inst_result.scalar_one_or_none()
        if not institution:
            institution = await get_or_create_institution(db)
        inst_id = institution.id
    else:
        institution = await get_or_create_institution(
            db, domain=institution_domain or "demo.proofpath.edu.au"
        )
        inst_id = institution.id

    user = User(
        clerk_id=clerk_id,
        institution_id=inst_id,
        role=role if role in ("admin", "teacher", "student") else "student",
        email=email,
        name=name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def resolve_user_by_clerk(db: AsyncSession, clerk_id: str, user_id: str | None = None) -> User:
    if user_id:
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        db_user = result.scalar_one_or_none()
        if db_user:
            return db_user
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    db_user = result.scalar_one_or_none()
    if db_user:
        return db_user
    from fastapi import HTTPException

    raise HTTPException(400, "User profile incomplete — sync account from dashboard first")
