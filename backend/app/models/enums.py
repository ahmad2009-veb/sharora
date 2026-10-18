import enum


class FloorKind(enum.StrEnum):
    commercial = "commercial"
    residential = "residential"


class UnitKind(enum.StrEnum):
    apartment = "apartment"
    commercial = "commercial"


class UnitStatus(enum.StrEnum):
    free = "free"
    reserved = "reserved"
    sold = "sold"
