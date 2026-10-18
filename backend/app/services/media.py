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


def ensure_media_dirs() -> None:
    if settings.blob_read_write_token or settings.vercel:
        return  # read-only filesystem on Vercel; uploads go to Blob
    for subdir in UPLOAD_SUBDIRS:
        (Path(settings.media_dir) / subdir).mkdir(parents=True, exist_ok=True)


def save_upload(file: UploadFile, subdir: str) -> str:
    """Validates that the upload is a real raster image and stores it under media/<subdir>."""
    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"Файл больше {settings.max_upload_mb} МБ")

    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
            image_format = img.format or ""
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Файл не является изображением") from exc

    ext = FORMAT_EXTENSIONS.get(image_format)
    if ext is None:
        raise HTTPException(status_code=400, detail="Поддерживаются JPG, PNG и WebP")

    filename = f"{uuid.uuid4().hex}{ext}"
    if settings.blob_read_write_token:
        return upload_to_blob(f"{subdir}/{filename}", data, CONTENT_TYPES[ext])
    if settings.vercel:
        raise HTTPException(status_code=500, detail="Хранилище не настроено: BLOB_READ_WRITE_TOKEN")

    target_dir = Path(settings.media_dir) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / filename).write_bytes(data)
    return f"{settings.media_url}/{subdir}/{filename}"


def upload_to_blob(pathname: str, data: bytes, content_type: str) -> str:
    """Stores a public file in Vercel Blob and returns its absolute URL."""
    try:
        res = httpx.put(
            BLOB_API_URL,
            params={"pathname": pathname},
            content=data,
            headers={
                "authorization": f"Bearer {settings.blob_read_write_token}",
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
