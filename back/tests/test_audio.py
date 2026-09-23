import time

from tests.helpers import create_interview

MP3 = b"ID3" + b"0" * 2048


def test_upload_validates_and_serves_signed_audio_with_range(auth_client, position_id, settings):
    iid = create_interview(auth_client, position_id)
    r = auth_client.post(
        f"/interviews/{iid}/audio", files={"file": ("a.exe", b"MZ", "application/octet-stream")}
    )
    assert r.status_code == 415
    r = auth_client.post(f"/interviews/{iid}/audio", files={"file": ("../../evil.mp3", MP3, "audio/mpeg")})
    assert r.status_code == 202 and r.json()["has_audio"] is True
    files = list(settings.audio_dir.iterdir())
    assert len(files) == 1 and files[0].name.startswith(f"interview_{iid}_")
    url = auth_client.get(f"/interviews/{iid}/audio-url").json()["url"]
    ranged = auth_client.get(url, headers={"Range": "bytes=0-2"})
    assert ranged.status_code == 206 and ranged.content == b"ID3"
    assert auth_client.get(f"/interviews/{iid}/audio?expires=1&signature=x").status_code == 403


def test_upload_too_large(auth_client, position_id, settings):
    settings.max_upload_mb = 1
    iid = create_interview(auth_client, position_id)
    r = auth_client.post(
        f"/interviews/{iid}/audio", files={"file": ("a.mp3", b"0" * (1024 * 1024 + 10), "audio/mpeg")}
    )
    assert r.status_code == 413 and not any(settings.audio_dir.iterdir())


def test_delete_interview_removes_audio(auth_client, position_id, settings):
    iid = create_interview(auth_client, position_id)
    auth_client.post(f"/interviews/{iid}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})
    auth_client.delete(f"/interviews/{iid}")
    assert not any(settings.audio_dir.iterdir())


def test_errors_do_not_leak_paths(auth_client, position_id):
    iid = create_interview(auth_client, position_id)
    r = auth_client.get(f"/interviews/{iid}/audio-url")
    assert r.status_code == 404 and "/" not in r.json()["detail"]


def test_audio_rejects_non_ascii_signature(auth_client, position_id):
    iid = create_interview(auth_client, position_id)
    auth_client.post(f"/interviews/{iid}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})
    expires = int(time.time()) + 3600
    r = auth_client.get(f"/interviews/{iid}/audio?expires={expires}&signature=%C3%A9")
    assert r.status_code == 403


def test_audio_signature_does_not_work_for_another_interview(auth_client, position_id):
    iid_a = create_interview(auth_client, position_id)
    iid_b = create_interview(auth_client, position_id)
    auth_client.post(f"/interviews/{iid_a}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})
    auth_client.post(f"/interviews/{iid_b}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})
    query = auth_client.get(f"/interviews/{iid_a}/audio-url").json()["url"].split("?", 1)[1]
    r = auth_client.get(f"/interviews/{iid_b}/audio?{query}")
    assert r.status_code == 403


def test_audio_signature_invalidated_by_reupload(auth_client, position_id):
    iid = create_interview(auth_client, position_id)
    auth_client.post(f"/interviews/{iid}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})
    url = auth_client.get(f"/interviews/{iid}/audio-url").json()["url"]
    assert auth_client.get(url).status_code == 200
    auth_client.post(f"/interviews/{iid}/audio", files={"file": ("b.mp3", MP3, "audio/mpeg")})
    assert auth_client.get(url).status_code == 403


def test_audio_nonexistent_id_returns_same_response_as_bad_signature(auth_client):
    expires = int(time.time()) + 3600
    r_bad_sig = auth_client.get(f"/interviews/1/audio?expires={expires}&signature=abc")
    r_missing_id = auth_client.get(f"/interviews/999999/audio?expires={expires}&signature=abc")
    assert r_bad_sig.status_code == 403
    assert r_missing_id.status_code == 403
    assert r_bad_sig.json() == r_missing_id.json()
