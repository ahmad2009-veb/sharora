from app.schemas.common import ORMModel


class LoginRequest(ORMModel):
    username: str
    password: str


class TokenOut(ORMModel):
    access_token: str
    token_type: str = "bearer"


class AdminMeOut(ORMModel):
    id: int
    username: str
