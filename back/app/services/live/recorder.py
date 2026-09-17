"""Gravação do áudio da entrevista ao vivo: PCM16 LE, 16 kHz, mono, anexado a um único arquivo."""

import shutil
import struct
from pathlib import Path

SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2  # bytes (16 bits)
BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH  # 32000
COPY_CHUNK = 1024 * 1024


class PcmRecorder:
    """Anexa os frames recebidos ao mesmo `.pcm`, inclusive entre reconexões."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self._f = None
        self.bytes_written = 0

    def open(self) -> None:
        self._f = self.path.open("ab")

    def append(self, chunk: bytes) -> None:
        self._f.write(chunk)
        self._f.flush()  # ~10 escritas/s; mantém o mtime atual (manutenção) e não perde áudio em queda
        self.bytes_written += len(chunk)

    def close(self) -> None:
        if self._f is not None:
            self._f.close()
            self._f = None


def wav_header(data_size: int) -> bytes:
    """Header WAV (PCM) de 44 bytes; lógica vinda de `convert_pcm_to_wav` do legado."""
    return b"".join([
        b"RIFF", struct.pack("<I", 36 + data_size), b"WAVE",
        b"fmt ", struct.pack("<I", 16),                       # tamanho do chunk fmt (PCM)
        struct.pack("<H", 1),                                 # formato de áudio: PCM
        struct.pack("<H", CHANNELS),
        struct.pack("<I", SAMPLE_RATE),
        struct.pack("<I", BYTES_PER_SECOND),                  # byte rate
        struct.pack("<H", CHANNELS * SAMPLE_WIDTH),           # block align
        struct.pack("<H", SAMPLE_WIDTH * 8),                  # bits por amostra
        b"data", struct.pack("<I", data_size),
    ])


def finalize_wav(pcm_path: Path, wav_path: Path) -> float:
    """Gera o WAV a partir do PCM sem carregá-lo na memória, apaga o `.pcm` e devolve a duração (s)."""
    pcm_path, wav_path = Path(pcm_path), Path(wav_path)
    data_size = pcm_path.stat().st_size
    with pcm_path.open("rb") as pcm, wav_path.open("wb") as wav:
        wav.write(wav_header(data_size))
        shutil.copyfileobj(pcm, wav, COPY_CHUNK)
    pcm_path.unlink(missing_ok=True)
    return data_size / BYTES_PER_SECOND
