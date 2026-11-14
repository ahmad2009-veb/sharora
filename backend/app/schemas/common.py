import re

from pydantic import BaseModel, ConfigDict, Field

PHONE_RE = re.compile(r"^\+992\d{9}$")


def normalize_tj_phone(value: str) -> str:
    """ "+992 93 123 45 67" → "+992931234567"; raises ValueError for non-Tajik numbers."""
    normalized = "".join(ch for ch in value if ch.isdigit() or ch == "+")
    if normalized.startswith("992"):
        normalized = f"+{normalized}"
    if not PHONE_RE.match(normalized):
        raise ValueError("Укажите номер в формате +992 XX XXX XXXX")
    return normalized


def reject_null(value: object) -> object:
    """PATCH field of a non-nullable column: omitted means unchanged, explicit null is refused."""
    if value is None:
        raise ValueError("Поле не может быть пустым")
    return value


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RoomDetail(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    area: float = Field(gt=0)


class PolygonPoint(BaseModel):
    """A polygon vertex in percent of the floor plan image (0–100)."""

    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
