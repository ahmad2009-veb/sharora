from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.admin_user import AdminUser
    from app.models.installment import InstallmentPayment
    from app.models.unit import Unit


class Sale(Base):
    """Buyer data for a sold unit. Admin-only: never exposed by the public API.

    Returning a unit to free/reserved archives the record instead of deleting it.
    """

    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # SET NULL keeps the sales history even if a unit is removed from the catalogue.
    unit_id: Mapped[int | None] = mapped_column(
        ForeignKey("units.id", ondelete="SET NULL"), nullable=True, index=True
    )
    buyer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    buyer_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    # Paid at signing. Legacy rows (before schedules) may lack total_price.
    down_payment: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_type: Mapped[str] = mapped_column(
        String(16), default="full", server_default="full", nullable=False
    )  # full | installment
    term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    markup_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0, server_default="0", nullable=False
    )
    first_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    unit: Mapped["Unit | None"] = relationship("Unit", back_populates="sales")
    author: Mapped["AdminUser | None"] = relationship("AdminUser")
    payments: Mapped[list["InstallmentPayment"]] = relationship(
        "InstallmentPayment",
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="InstallmentPayment.number",
    )
