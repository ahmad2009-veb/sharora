from pydantic import Field, field_validator

from app.schemas.common import ORMModel, reject_null


class BlockOut(ORMModel):
    id: int
    letter: str
    name: str
    sort_order: int
    cover_image: str | None
    free_count: int
    reserved_count: int
    sold_count: int
    total_count: int


class BlockCreate(ORMModel):
    letter: str = Field(min_length=1, max_length=4)
    name: str = Field(min_length=1, max_length=120)
    sort_order: int = 0
    cover_image: str | None = Field(default=None, max_length=300)


class BlockUpdate(ORMModel):
    letter: str | None = Field(default=None, min_length=1, max_length=4)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    sort_order: int | None = None
    cover_image: str | None = Field(default=None, max_length=300)

    _not_null = field_validator("letter", "name", "sort_order")(reject_null)
