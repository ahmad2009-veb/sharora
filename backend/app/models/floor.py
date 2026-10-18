from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import FloorKind

if TYPE_CHECKING:
    from app.models.block import Block
    from app.models.unit import Unit


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    block_id: Mapped[int] = mapped_column(
        ForeignKey("blocks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(60), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[FloorKind] = mapped_column(
        SAEnum(FloorKind, native_enum=False, length=20),
        default=FloorKind.residential,
        nullable=False,
    )
    plan_image: Mapped[str | None] = mapped_column(String(300), nullable=True)

    block: Mapped["Block"] = relationship("Block", back_populates="floors")
    units: Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="floor", cascade="all, delete-orphan", order_by="Unit.number"
    )
