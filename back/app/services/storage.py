from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.errors import PayloadTooLarge, UnsupportedMediaType

AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
CHUNK = 1024 * 1024


class Storage:
    def __init__(self, settings):
        self.settings = settings

    def avatar_path(self, name: str) -> Path:
        return self.settings.avatar_dir / Path(name).name

    def save_avatar(self, user_id: int, upload: UploadFile) -> str:
        ext = Path(upload.filename or "").suffix.lower()
        if ext not in AVATAR_EXTENSIONS or not (upload.content_type or "").startswith("image/"):
            raise UnsupportedMediaType("Envie uma imagem PNG, JPG ou WEBP.")
        name = f"user_{user_id}_{uuid4().hex}{ext}"
        self._copy_limited(upload, self.avatar_path(name), self.settings.max_avatar_mb)
        return name

    def delete_file(self, directory: Path, name: str | None) -> None:
        if name:
            (directory / Path(name).name).unlink(missing_ok=True)

    @staticmethod
    def _copy_limited(upload: UploadFile, dest: Path, limit_mb: int) -> None:
        limit, total = limit_mb * CHUNK, 0
        with dest.open("wb") as out:
            while chunk := upload.file.read(CHUNK):
                total += len(chunk)
                if total > limit:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise PayloadTooLarge(f"O arquivo excede o limite de {limit_mb} MB.")
                out.write(chunk)
