import math
import io
import json
import os
import sqlite3
import assemblyai as aai
from pydub import AudioSegment
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from database import get_db_connection
import asyncio
import datetime
from openai import AsyncOpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ASSEMBLYAI_API_KEY = "82638fa196894930b9c02d106fdd6c7c"

aai.settings.api_key = ASSEMBLYAI_API_KEY
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

router = APIRouter(
    prefix="/positions/interviews",
    tags=["Interview Processing"]
)


with open("prompts/prompt_analitico.txt", "r") as f:
    prompt_template = f.read()

@router.patch("/{id}/process/analysis")
async def generate_analysis(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
            SELECT
                interviews.transcript,
                interviews.notes,
                positions.position AS position,
                positions.skills AS skills,
                positions.description AS description
            FROM interviews
            JOIN positions ON interviews.position_id = positions.id
            WHERE interviews.id = ?
        """,
        (id,)
    )
    row = cursor.fetchone()
    if not row or not row["transcript"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    interview_info = {
        "position_data": {
            "position": row["position"],
            "skills": json.loads(row["skills"]),
            "description": row["description"]
        },
        "transcript": json.loads(row["transcript"]),
        "notes": row["notes"]
    }
    info_json = json.dumps(interview_info)

    prompt_final = prompt_template + info_json

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt_final}],
        response_format={ "type": "json_object" },
        temperature=0.5
    )
    json_gerado = response.choices[0].message.content
    dictionary = json.loads(json_gerado)
    cursor.execute("UPDATE interviews SET analysis = ?, score = ? WHERE id = ?", (json_gerado, dictionary["score"]["overall"], id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": id, "analysis": dictionary, "message": "Resumo gerado e salvo com sucesso"})

with open("prompts/prompt_questions.txt", "r") as f:
    original_prompt_template = f.read()

def get_utterances_last_n_seconds(data, n_seconds):
    if not data.get("utterances"):
        return []
    cutoff_time = max(utt["end"] for utt in data["utterances"]) - n_seconds
    return [utt for utt in data["utterances"] if utt["end"] >= cutoff_time]

def append_transcript_to_prompt(prompt, utterances):
    transcript_text = "\n".join(
        [f"Speaker {utt['speaker']}: {utt['text']}" for utt in utterances]
    )
    return prompt + "\n\n" + transcript_text

async def save_transcript_to_db(id: int, transcript_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    transcript_json_text = json.dumps(transcript_data)
    cursor.execute(
        "UPDATE interviews SET transcript = ? WHERE id = ?", (transcript_json_text, id)
    )
    conn.commit()
    conn.close()

@router.post("/{id}/transcribe_audio_file")
async def transcribe_audio_file(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row or not row["audio_file"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Audio file not found for this interview")

    audio_path = row["audio_file"]

    if not os.path.exists(audio_path):
        conn.close()
        raise HTTPException(status_code=404, detail="Audio file not found on server")

    try:
        config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )

        transcript = aai.Transcriber(config=config).transcribe(audio_path)

        if transcript.status == "error":
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")

        utt_list = []
        for utt in transcript.utterances:
            utt_dict = {
                "speaker": utt.speaker,
                "text": utt.text,
                "start": utt.start,
                "end": utt.end
            }
            utt_list.append(utt_dict)

        transcript_json = json.dumps(utt_list)

        cursor.execute(
            "UPDATE interviews SET transcript = ? WHERE id = ?", (transcript_json, id)
        )
        conn.commit()

    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    conn.close()
    return JSONResponse(content={"id": id, "message": "Audio transcribed and transcript saved successfully", "transcript": utt_list})

@router.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket, id: int = Query(...)):
    await websocket.accept()

    transcript_data = {"utterances": []}

    date = datetime.now().isoformat()
    audio_filename = f"interview_{id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.wav"
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    audio_path = os.path.join(upload_dir, audio_filename)

    audio_file = await aiofiles.open(audio_path, 'wb')

    config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )
    streaming_client = aai.StreamingClient()

    try:
        await streaming_client.start(config=config)
        stop_event = asyncio.Event()

        async def send_audio():
            while True:
                audio_chunk = await websocket.receive_bytes()
                await audio_file.write(audio_chunk)
                await streaming_client.send(audio_chunk)

        async def receive_transcripts():
            async for transcript in streaming_client.listen():
                if hasattr(transcript, "utterances") and transcript.utterances:
                    utt_list = []
                    for utt in transcript.utterances:
                        utt_dict = {
                            "speaker": utt.speaker,
                            "text": utt.text,
                            "start": utt.start,
                            "end": utt.end,
                        }
                        utt_list.append(utt_dict)

                    transcript_data["utterances"].extend(utt_list)
                    await websocket.send_json({"transcript_update": utt_list})

        async def periodic_gpt_analysis():
            while not stop_event.is_set():
                await asyncio.sleep(40)
                last_utts = get_utterances_last_n_seconds(transcript_data, 50)
                if not last_utts:
                    continue
                prompt_to_send = append_transcript_to_prompt(original_prompt_template, last_utts)
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "user", "content": prompt_to_send},
                    ],
                    response_format={ "type": "json_object" },
                    max_tokens=200,
                    temperature=0.5
                )
                gpt_message = response.choices[0].message.content.strip()
                await websocket.send_json({"gpt_response": gpt_message})

        await asyncio.gather(
            send_audio(),
            receive_transcripts(),
            periodic_gpt_analysis()
        )

    except WebSocketDisconnect:
        stop_event.set()
        await save_transcript_to_db(id, transcript_data)
        await streaming_client.close()
        await websocket.close()
    except Exception as e:
        stop_event.set()
        await streaming_client.close()
        await websocket.close()
        print(f"WebSocket error: {e}")
    finally:
        await audio_file.close()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE interviews SET audio_file = ?, date = ? WHERE id = ?", (audio_filename, date, id)
        )
        conn.commit()
        conn.close()
