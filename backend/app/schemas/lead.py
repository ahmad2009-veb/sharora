from datetime import datetime

from pydantic import Field, field_validator

from app.models import Lead
from app.schemas.common import ORMModel, normalize_tj_phone


class LeadCreate(ORMModel):
    unit_id: int | None = None
    name: str = Field(max_length=120)
    phone: str = Field(max_length=32)
    message: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Укажите имя")
        return v

    @field_validator("phone")
    @classmethod
    def phone_is_tj(cls, v: str) -> str:
        return normalize_tj_phone(v)


class LeadOut(ORMModel):
    id: int
    unit_id: int | None
    name: str
    phone: str
    message: str | None
    created_at: datetime
    processed: bool


class LeadAdminOut(LeadOut):
    unit_label: str | None = None

    @classmethod
    def from_lead(cls, lead: Lead) -> "LeadAdminOut":
        label = None
        if lead.unit is not None:
            floor = lead.unit.floor
            label = f"Блок {floor.block.letter} · {floor.label} · {lead.unit.name}"
        return cls(**LeadOut.model_validate(lead).model_dump(), unit_label=label)


class LeadUpdate(ORMModel):
    processed: bool
