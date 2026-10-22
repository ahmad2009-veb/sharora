from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS_TOKEN_COOKIE_NAME, decode_access_token
from app.models import AdminUser


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Не авторизован")

    claims = decode_access_token(token)
    if claims is None:
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")

    admin = db.get(AdminUser, claims.admin_id)
    if admin is None or admin.token_version != claims.version:
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")
    return admin
