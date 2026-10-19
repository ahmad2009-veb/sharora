from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.sale import Sale


class InstallmentPayment(Base):
    """One row of a sale's payment schedule. Admin-only, like the sale itself.

    `status` stores only pending/paid; «просрочено» depends on today and is computed on read.
    """

    __tablename__ = "installment_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=0, server_default="0", nullable=False
    )
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), default="pending", server_default="pending", nullable=False
    )

    sale: Mapped["Sale"] = relationship("Sale", back_populates="payments")
