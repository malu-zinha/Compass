"""Apaga banco e arquivos locais de desenvolvimento e recria o schema.

Uso: python -m scripts.reset_dev_data
"""
import shutil
import sys

from alembic.config import Config

from alembic import command
from app.core.config import BASE_DIR, get_settings


def main() -> None:
    settings = get_settings()
    if input(f"Isso apaga TODOS os dados em {settings.data_dir}. Digite APAGAR para continuar: ") != "APAGAR":
        sys.exit("Cancelado.")
    for path in settings.data_dir.glob("compass.db*"):
        path.unlink()
    for directory in (settings.audio_dir, settings.avatar_dir):
        shutil.rmtree(directory, ignore_errors=True)
        directory.mkdir(parents=True)
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))
    command.upgrade(cfg, "head")
    print("Dados de desenvolvimento recriados.")


if __name__ == "__main__":
    main()
