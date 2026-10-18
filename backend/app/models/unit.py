from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UnitKind, UnitStatus

if TYPE_CHECKING:
    from app.models.floor import Floor
    from app.models.lead import Lead
    from app.models.sale import Sale


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    floor_id: Mapped[int] = mapped_column(
        ForeignKey("floors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[UnitKind] = mapped_column(
        SAEnum(UnitKind, native_enum=False, length=20), default=UnitKind.apartment, nullable=False
    )
    rooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    price_per_m2: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[UnitStatus] = mapped_column(
        SAEnum(UnitStatus, native_enum=False, length=20),
        default=UnitStatus.free,
        nullable=False,
        index=True,
    )
    layout_image: Mapped[str | None] = mapped_column(String(300), nullable=True)
    blueprint_image: Mapped[str | None] = mapped_column(String(300), nullable=True)
    polygon: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rooms_detail: Mapped[list | None] = mapped_column(JSON, nullable=True)

    floor: Mapped["Floor"] = relationship("Floor", back_populates="units")
    leads: Mapped[list["Lead"]] = relationship("Lead", back_populates="unit")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="unit")
