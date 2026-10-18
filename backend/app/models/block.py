from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.floor import Floor


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    letter: Mapped[str] = mapped_column(String(4), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cover_image: Mapped[str | None] = mapped_column(String(300), nullable=True)

    floors: Mapped[list["Floor"]] = relationship(
        "Floor", back_populates="block", cascade="all, delete-orphan", order_by="Floor.number"
    )
