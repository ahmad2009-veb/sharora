from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS_TOKEN_COOKIE_NAME, decode_access_token
from app.models import AdminUser


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Не авторизован")

    username = decode_access_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")

    admin = db.query(AdminUser).filter(AdminUser.username == username).one_or_none()
    if admin is None:
        raise HTTPException(status_code=401, detail="Не авторизован")
    return admin
