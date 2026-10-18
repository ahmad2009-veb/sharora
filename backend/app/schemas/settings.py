from pydantic import Field

from app.schemas.common import ORMModel


class SettingsOut(ORMModel):
    default_price_per_m2: float
    down_payment_min_percent: float
    max_term_months: int


class SettingsUpdate(ORMModel):
    default_price_per_m2: float | None = Field(default=None, gt=0)
    down_payment_min_percent: float | None = Field(default=None, ge=0, le=100)
    max_term_months: int | None = Field(default=None, ge=1, le=360)
