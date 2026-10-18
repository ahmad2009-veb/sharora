from sqlalchemy import Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CalculatorSettings(Base):
    """Singleton row (id=1) holding calculator defaults."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    default_price_per_m2: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, default=9000
    )
    down_payment_min_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=20
    )
    max_term_months: Mapped[int] = mapped_column(Integer, nullable=False, default=36)
