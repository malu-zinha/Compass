import math
import io
import json
import os
import sqlite3
import requests
from pydub import AudioSegment
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI

load_dotenv()
DATABASE = "./interviews.db"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI(
    title="API de Resumos de Entrevistas",
    description="Uma API para gerar resumos de transcrições usando o OpenAI GPT.",
    version="0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_table():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            position TEXT NOT NULL,
            skills TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            number TEXT,
            audio_file TEXT,
            notes TEXT,
            date TEXT,
            transcript TEXT,
            labeled TEXT,
            analysis TEXT,
            score INTEGER,
            position_id INTEGER,
            FOREIGN KEY (position_id) REFERENCES positions(id)
        )
    """)

    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

create_table()

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

class PositionCreateRequest(BaseModel):
    position: str
    skills: list[str]
    description: str

class IterrviewCreateRequest(BaseModel):
    id: int
    name: str
    email: str
    number: str
    notes: str

@app.post("/positions")
def create_position(position: PositionCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    skills_json = json.dumps(position.skills)

    try:
        cursor.execute(
            """
            INSERT INTO positions (position, skills, description)
            VALUES (?, ?, ?)
            """,
            (position.position, skills_json, position.description)
        )
        conn.commit()
        inserted_id = cursor.lastrowid
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    conn.close()

    return JSONResponse(content={
        "id": inserted_id,
        "message": "Cargo registrado com sucesso!"
    })

@app.post("/positions/interviews")
async def insert_interview_audio(position_id: int, audio: UploadFile = File(...)):
    print(audio.filename, position_id)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM positions WHERE id = (?)', (position_id,))
        resp = cursor.fetchone()
        print(resp[0])
        if not resp[0]:
            raise HTTPException(status_code=500, detail=f"Não há cargo com position_id = {position_id}")
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao acessar o banco de dados: {e}")
    date = datetime.now().isoformat()
    audio_file = f"uploads/{audio.filename}"
    with open(audio_file, "wb") as f:
        f.write(await audio.read())
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO interviews (audio_file, date, position_id) VALUES (?, ?, ?)""",
            (audio_file, date, position_id)
        )
        conn.commit()
        interview_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao inserir áudio no banco de dados")
    return JSONResponse(content={
        "id": interview_id,
        "message":"Áudio registrado com sucesso!"
    })

@app.post("/positions/interviews/{id}/candidate")
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

@app.post("/positions/interviews/{id}/transcribe")
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

@app.post("/positions/interviews/{id}/lable-transcript")
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

@app.post("/positions/interviews/{id}/generate_analysis")
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

@app.get("/positions/interviews/{position_id}")
def get_interviews(
    position_id: int = 0,
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(10, ge=1, le=100, description="Itens por página")
):
    offset = (page - 1) * per_page
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if position_id:
            cursor.execute("SELECT COUNT(*) FROM interviews WHERE position_id = ?", (position_id,))
            total = cursor.fetchone()[0]
            cursor.execute(
                """
                    SELECT
                        interviews.id,
                        interviews.name,
                        interviews.email,
                        interviews.number,
                        interviews.date,
                        interviews.labeled,
                        interviews.analysis,
                        interviews.notes,
                        interviews.score,
                        positions.id AS position_id,
                        positions.position AS position
                    FROM interviews
                    JOIN positions ON interviews.position_id = positions.id
                    WHERE position_id = ?
                    ORDER BY date DESC LIMIT ? OFFSET ?
                """,
                (position_id, per_page, offset)
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM interviews")
            total = cursor.fetchone()[0]
            cursor.execute(
                """
                    SELECT
                        interviews.id,
                        interviews.name,
                        interviews.email,
                        interviews.number,
                        interviews.date,
                        interviews.labeled,
                        interviews.analysis,
                        interviews.notes,
                        interviews.score,
                        positions.id AS position_id,
                        positions.position AS position
                    FROM interviews
                    JOIN positions ON interviews.position_id = positions.id
                    ORDER BY score DESC LIMIT ? OFFSET ?
                """,
                (per_page, offset)
            )
        rows = cursor.fetchall()
        conn.close()
        interviews = []
        for row in rows:
            interviews.append({
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "number": row["number"],
                "date": row["date"],
                "labeled": json.loads(row["labeled"]) if row["labeled"] else "",
                "analysis": json.loads(row["analysis"]) if row["analysis"] else "",
                "score": row["score"],
                "position_id": row["position_id"],
                "position": row["position"]
            })
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao acessar o banco de dados: {e}")
    return JSONResponse(content={
        "interviews": interviews,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    })

@app.get("/positions")
def get_interviews(
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(10, ge=1, le=100, description="Itens por página")
):
    offset = (page - 1) * per_page
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM positions")
        total = cursor.fetchone()[0]
        cursor.execute(
            """
                SELECT *
                FROM positions
                ORDER BY id DESC LIMIT ? OFFSET ?
            """,
            (per_page, offset)
        )
        rows = cursor.fetchall()
        conn.close()
        positions = []
        for row in rows:
            positions.append({
                "id": row["id"],
                "position": row["position"],
                "skills": json.loads(row["skills"]),
                "description": row["description"]
            })
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao acessar o banco de dados: {e}")
    return JSONResponse(content={
        "positions": positions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    })

@app.delete("/positions/interviews/{id}")
def delete_interview(id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM interviews WHERE id = ?", (id,))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao deletar entrevista no banco de dados")
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    return JSONResponse(content={"message": "Entrevista deletada com sucesso"})

@app.delete("/positions{position_id}")
def delete_position(position_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM interviews WHERE position_id = ?", (position_id,))
        cursor.execute("DELETE FROM positions WHERE id = ?", (position_id,))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao deletar cargo no banco de dados")
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    return JSONResponse(content={"message": "Cargo deletado com sucesso"})
