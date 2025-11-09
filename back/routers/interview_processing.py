import math
import io
import json
import os
import sqlite3
import openai
from pydub import AudioSegment
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from database import get_db_connection, client
from models import IterrviewCreateRequest

router = APIRouter(
    prefix="/positions/interviews",
    tags=["Interview Processing"]
)

@router.patch("/{id}/process/candidate")
def insert_interview(request: IterrviewCreateRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE interviews
            SET
                name = ?,
                email = ?,
                number = ?,
                notes = ?,
                transcript = '',
                labeled = '',
                analysis = '',
                score = ''
            WHERE id = ?
        """, (request.name, request.email, request.number, request.notes, request.id))
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir entrevista no banco de dados: {e}")

    return JSONResponse(content={
        "id": request.id,
        "message":"Informações do candidato registradas com sucesso!"
    })

@router.patch("/{id}/process/transcribe")
async def transcribe(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")

    file_location = row["audio_file"]

    try:
        file_size = os.path.getsize(file_location)
    except FileNotFoundError:
        conn.close()
        raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado no disco")

    MAX_SIZE_BYTES = 25 * 1024 * 1024
    transcript = ""

    try:
        if file_size <= MAX_SIZE_BYTES:
            print(f"Arquivo tem {file_size / (1024*1024):.2f} MB. Enviando diretamente.")
            
            with open(file_location, "rb") as audio_file:
                transcript_response = await client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            
            transcript = transcript_response.text

        else:
            print(f"Arquivo tem {file_size / (1024*1024):.2f} MB. Iniciando divisão (chunking).")
            
            try:
                audio = AudioSegment.from_file(file_location)
            except Exception as e:
                conn.close()
                raise HTTPException(status_code=500, detail=f"Erro ao carregar áudio com pydub: {e}")

            CHUNK_DURATION_MS = 10 * 60 * 1000
            num_chunks = math.ceil(len(audio) / CHUNK_DURATION_MS)
            all_transcripts = []
            
            print(f"Dividindo áudio em {num_chunks} pedaços.")

            for i in range(num_chunks):
                start_ms = i * CHUNK_DURATION_MS
                end_ms = (i + 1) * CHUNK_DURATION_MS
                chunk = audio[start_ms:end_ms]

                buffer = io.BytesIO()
                chunk.export(buffer, format="mp3") 
                buffer.seek(0)
                
                buffer.name = f"chunk_{i+1}.mp3" 

                print(f"Enviando chunk {i+1}/{num_chunks}...")
                
                chunk_response = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=buffer
                )
                all_transcripts.append(chunk_response.text)
                buffer.close()

            transcript = " ".join(all_transcripts)

    except openai.APIError as e:
        conn.close()
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Erro da API OpenAI: {e.message}"
        )
    except Exception as e:
        conn.close()
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado no processo de transcrição: {str(e)}"
        )

    try:
        cursor.execute("UPDATE interviews SET transcript = ? WHERE id = ?", (transcript, id))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar transcrição no banco: {e}")
    finally:
        conn.close()

    print("Transcrição salva com sucesso.")
    return JSONResponse(content={"id": id, "transcript_preview": transcript[:200] + "...", "message": "Transcrição salva com sucesso"})

@router.patch("/{id}/process/lable-transcript")
async def diarize(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT transcript FROM interviews WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row or not row["transcript"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada.")
    transcript = row["transcript"]
    with open("prompts/diarize.txt") as f:
        prompt_template = f.read()
    prompt = prompt_template + transcript
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0,
        response_format={"type": "json_object"}
    )
    labeled_json = response.choices[0].message.content
    cursor.execute("UPDATE interviews SET labeled = ? WHERE id = ?", (labeled_json, id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": id, "labeled_json": json.loads(labeled_json)})

@router.patch("/{id}/process/generate_analysis")
async def generate_analysis(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
            SELECT
                interviews.labeled,
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
    if not row or not row["labeled"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    interview_info = {
        "position_data": {
            "position": row["position"],
            "skills": json.loads(row["skills"]),
            "description": row["description"]
        },
        "transcript": json.loads(row["labeled"]),
        "notes": row["notes"]
    }
    info_json = json.dumps(interview_info)

    with open("prompts/prompt_analitico.txt") as fin:
        prompt_template = fin.read()
    prompt_final = prompt_template + info_json

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt_final}],
        temperature=0
    )
    json_gerado = response.choices[0].message.content
    dictionary = json.loads(json_gerado)
    cursor.execute("UPDATE interviews SET analysis = ?, score = ? WHERE id = ?", (json_gerado, dictionary["score"]["overall"], id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": id, "analysis": dictionary, "message": "Resumo gerado e salvo com sucesso"})
