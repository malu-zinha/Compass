import struct

from app.services.live.recorder import PcmRecorder, finalize_wav, wav_header, write_wav


def test_wav_header_fields():
    h = wav_header(32000)
    assert h[:4] == b"RIFF" and h[8:12] == b"WAVE" and len(h) == 44
    assert struct.unpack("<I", h[24:28])[0] == 16000 and struct.unpack("<I", h[40:44])[0] == 32000


def test_reconnect_appends_to_same_file_and_finalizes(tmp_path):
    pcm = tmp_path / "interview_1.pcm"
    for _ in range(2):  # duas conexões seguidas
        r = PcmRecorder(pcm)
        r.open()
        r.append(b"\x00\x01" * 8000)
        r.close()
    duration = finalize_wav(pcm, tmp_path / "interview_1.wav")
    assert duration == 1.0 and not pcm.exists()
    assert (tmp_path / "interview_1.wav").stat().st_size == 44 + 32000


def test_write_wav_keeps_pcm_until_caller_deletes_it(tmp_path):
    pcm = tmp_path / "interview_1.pcm"
    pcm.write_bytes(b"\x00\x01" * 16000)
    assert write_wav(pcm, tmp_path / "interview_1.wav") == 1.0 and pcm.exists()
    assert (tmp_path / "interview_1.wav").stat().st_size == 44 + 32000
