from app.schemas.common import ORMModel


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
    letter: str
    name: str
    sort_order: int = 0
    cover_image: str | None = None


class BlockUpdate(ORMModel):
    letter: str | None = None
    name: str | None = None
    sort_order: int | None = None
    cover_image: str | None = None
