from app.schemas.common import ORMModel


class StatsOut(ORMModel):
    free: int
    reserved: int
    sold: int
    total: int
