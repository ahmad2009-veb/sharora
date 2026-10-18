from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Block, Floor, Unit, UnitStatus


def block_counts(db: Session) -> dict[int, tuple[int, int]]:
    """Returns {block_id: (free_count, total_count)}."""
    rows = db.execute(
        select(
            Floor.block_id,
            func.sum(case((Unit.status == UnitStatus.free, 1), else_=0)),
            func.count(Unit.id),
        )
        .join(Unit, Unit.floor_id == Floor.id)
        .group_by(Floor.block_id)
    ).all()
    return {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in rows}


def floor_counts(db: Session, block_id: int) -> dict[int, tuple[int, int]]:
    """Returns {floor_id: (free_count, total_count)} for floors of a given block."""
    rows = db.execute(
        select(
            Unit.floor_id,
            func.sum(case((Unit.status == UnitStatus.free, 1), else_=0)),
            func.count(Unit.id),
        )
        .join(Floor, Floor.id == Unit.floor_id)
        .where(Floor.block_id == block_id)
        .group_by(Unit.floor_id)
    ).all()
    return {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in rows}


def global_stats(db: Session) -> dict[str, int]:
    rows = db.execute(select(Unit.status, func.count(Unit.id)).group_by(Unit.status)).all()
    counts = {status.value: 0 for status in UnitStatus}
    total = 0
    for status, count in rows:
        key = status.value if hasattr(status, "value") else status
        counts[key] = int(count)
        total += int(count)
    return {**counts, "total": total}


def get_block_or_none(db: Session, letter: str) -> Block | None:
    return db.execute(select(Block).where(Block.letter == letter)).scalar_one_or_none()
