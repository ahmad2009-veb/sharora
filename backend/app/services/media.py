import uuid
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings

settings = get_settings()

FORMAT_EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
CONTENT_TYPES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
# Same endpoint and API version as the official @vercel/blob SDK (put()).
BLOB_API_URL = "https://vercel.com/api/blob/"
BLOB_API_VERSION = "13"
UPLOAD_SUBDIRS = {"floors", "units", "blocks"}
# A few-MB PNG can still declare a huge canvas that every visitor's browser must decode.
MAX_IMAGE_PIXELS = 40_000_000


def ensure_media_dirs() -> None:
    if settings.uses_blob or settings.vercel:
        return  # read-only filesystem on Vercel; uploads go to Blob
    for subdir in UPLOAD_SUBDIRS:
        (Path(settings.media_dir) / subdir).mkdir(parents=True, exist_ok=True)


def save_upload(file: UploadFile, subdir: str, oidc_token: str | None = None) -> str:
    """Validates that the upload is a real raster image and stores it in Blob or media/<subdir>.

    `oidc_token` is the request's x-vercel-oidc-token header (Vercel Functions).
    """
    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"Файл больше {settings.max_upload_mb} МБ")

    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
            image_format = img.format or ""
            width, height = img.size
    # Pillow reports some corrupt files (bad PNG chunks/CRCs) as SyntaxError or ValueError.
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
    ) as exc:
        raise HTTPException(status_code=400, detail="Файл не является изображением") from exc
    if width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=400, detail="Слишком большое разрешение изображения")

    ext = FORMAT_EXTENSIONS.get(image_format)
    if ext is None:
        raise HTTPException(status_code=400, detail="Поддерживаются JPG, PNG и WebP")

    filename = f"{uuid.uuid4().hex}{ext}"
    if settings.uses_blob:
        return upload_to_blob(f"{subdir}/{filename}", data, CONTENT_TYPES[ext], oidc_token)
    if settings.vercel:
        raise HTTPException(
            status_code=500,
            detail="Хранилище не настроено: BLOB_STORE_ID или BLOB_READ_WRITE_TOKEN",
        )

    target_dir = Path(settings.media_dir) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / filename).write_bytes(data)
    return f"{settings.media_url}/{subdir}/{filename}"


def blob_auth_headers(oidc_token: str | None) -> dict[str, str]:
    """Same credential order as @vercel/blob: read-write token, then OIDC + store id."""
    if settings.blob_read_write_token:
        return {"authorization": f"Bearer {settings.blob_read_write_token}"}
    token = oidc_token or settings.vercel_oidc_token
    if not token:
        raise HTTPException(status_code=500, detail="Нет OIDC-токена Vercel для доступа к Blob")
    store_id = settings.blob_store_id.removeprefix("store_")
    return {"authorization": f"Bearer {token}", "x-vercel-blob-store-id": store_id}


def upload_to_blob(
    pathname: str, data: bytes, content_type: str, oidc_token: str | None = None
) -> str:
    """Stores a public file in Vercel Blob and returns its absolute URL."""
    headers = blob_auth_headers(oidc_token)
    try:
        res = httpx.put(
            BLOB_API_URL,
            params={"pathname": pathname},
            content=data,
            headers={
                **headers,
                "x-api-version": BLOB_API_VERSION,
                "x-vercel-blob-access": "public",
                "x-content-type": content_type,
                "x-add-random-suffix": "0",
            },
            timeout=30,
        )
        res.raise_for_status()
        return str(res.json()["url"])
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Не удалось сохранить файл") from exc
