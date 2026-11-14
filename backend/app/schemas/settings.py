from pydantic import Field, field_validator

from app.schemas.common import ORMModel, reject_null


class SettingsOut(ORMModel):
    default_price_per_m2: float
    down_payment_min_percent: float
    max_term_months: int


class SettingsUpdate(ORMModel):
    default_price_per_m2: float | None = Field(default=None, gt=0, lt=10**10)
    down_payment_min_percent: float | None = Field(default=None, ge=0, le=100)
    max_term_months: int | None = Field(default=None, ge=1, le=360)

    _not_null = field_validator(
        "default_price_per_m2", "down_payment_min_percent", "max_term_months"
    )(reject_null)
