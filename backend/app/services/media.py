import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings

settings = get_settings()

FORMAT_EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
UPLOAD_SUBDIRS = {"floors", "units", "blocks"}


def ensure_media_dirs() -> None:
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

    target_dir = Path(settings.media_dir) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    (target_dir / filename).write_bytes(data)
    return f"{settings.media_url}/{subdir}/{filename}"
