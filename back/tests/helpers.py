def create_interview(client, position_id, mode="upload") -> int:
    return client.post("/interviews", json={
        "position_id": position_id, "candidate_name": "Carla", "candidate_email": "carla@example.com",
        "candidate_phone": "11 90000-0000", "mode": mode, "recording_consent": True}).json()["id"]
