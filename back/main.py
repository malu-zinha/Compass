import json
import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
import requests

load_dotenv()
DATABASE = './interviews.db'
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI(
    title="API de Resumos de Entrevistas",
    description="Uma API para gerar resumos de transcrições usando o OpenAI GPT.",
    version="0.0.1"
)

# Configurar CORS
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
            audio_file TEXT,
            date TEXT,
            transcription TEXT,
            diarized TEXT,
            summary TEXT,
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

# Carregar prompts
with open('prompts/prompt_padrao.txt') as fin:
    PROMPT_PADRAO = fin.read()

with open('prompts/prompt_analitico.txt') as fin:
    PROMPT_ANALITICO = fin.read()

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

class PositionCreateRequest(BaseModel):
    position: str
    skills: list[str]
    description: str

class InterviewTranscribeRequest(BaseModel):
    id: int

class InterviewResumoRequest(BaseModel):
    id: int
    tipo_resumo: str = "padrao"

@app.post("/positions")
def create_position(position: PositionCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Converte a lista skills para JSON string para armazenar no banco
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
async def insert_interview(position_id: int, audio_file: UploadFile = File(...)):
    date = datetime.now().isoformat()
    file_location = f"uploads/{audio_file.filename}"
    with open(file_location, "wb") as f:
        f.write(await audio_file.read())
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO interviews (audio_file, date, transcription, diarized, summary, position_id)
            VALUES (?, ?, '', '', '', ?)
        """, (file_location, date, position_id))
        conn.commit()
        interview_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao inserir entrevista no banco de dados")

    return JSONResponse(content={
        "id":interview_id,
        "message":"Cargo registrado com sucesso!"
    })

@app.post("/transcribe")
async def transcribe(request: InterviewTranscribeRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (request.id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    file_location = row["audio_file"]
    # Enviar para Whisper API
    with open(file_location, "rb") as f:
        files = {
            "file": (os.path.basename(file_location), f, "application/octet-stream"),
            "model": (None, "whisper-1")
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        response = requests.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, files=files)
        if response.status_code == 200:
            transcription = response.json().get("text", "")
        else:
            conn.close()
            raise HTTPException(
                status_code=500,
                detail=f"Erro na transcrição do áudio: {response.text}"
            )

    # Atualizar no banco
    cursor.execute("UPDATE interviews SET transcription = ? WHERE id = ?", (transcription, request.id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": request.id, "transcription": transcription, "message": "Transcrição salva com sucesso"})

@app.post("/generate-summary")
async def generate_summary(request: InterviewTranscribeRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT diarized FROM interviews WHERE id = ?", (request.id,))
    row = cursor.fetchone()
    if not row or not row["diarized"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    transcricao = row["diarized"]
    prompt_template = PROMPT_PADRAO if request.tipo_resumo != "analitico" else PROMPT_ANALITICO
    prompt_final = prompt_template.format(DADOS_DA_TRANSCRICAO=transcricao)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt_final}],
        temperature=0
    )
    resumo_gerado = response.choices[0].message.content
    # Atualizar resumo no banco
    cursor.execute("UPDATE interviews SET summary = ? WHERE id = ?", (resumo_gerado, request.id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": request.id, "summary": resumo_gerado, "message": "Resumo gerado e salvo com sucesso"})

@app.post("/lable-transcription")
async def diarize(request: InterviewTranscribeRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT transcription FROM interviews WHERE id = ?", (request.id,))
    row = cursor.fetchone()
    if not row or not row["transcription"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada.")
    transcription = row["transcription"]
    with open("prompts/diarize.txt") as f:
        prompt_template = f.read()
    prompt = prompt_template + transcription
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0,
        response_format={"type": "json_object"}
    )
    labeled_json = response.choices[0].message.content
    cursor.execute("UPDATE interviews SET diarized = ? WHERE id = ?", (str(labeled_json), request.id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": request.id, "labeled_json": labeled_json})

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
        cursor.execute("SELECT COUNT(*) FROM interviews")
        total = cursor.fetchone()[0]
        if position_id:
            cursor.execute(
                """
                    SELECT 
                        interviews.id,
                        interviews.date,
                        interviews.diarized,
                        interviews.summary,
                        positions.id AS position_id,
                        positions.position AS position
                    FROM interviews
                    JOIN positions ON interviews.position_id = positions.id
                    WHERE interviews.id = ?
                    ORDER BY date DESC LIMIT ? OFFSET ?
                """,
                (position_id, per_page, offset)
            )
        else:
            cursor.execute(
                """
                    SELECT 
                        interviews.id,
                        interviews.date,
                        interviews.diarized,
                        interviews.summary,
                        positions.id AS position_id,
                        positions.position AS position
                    FROM interviews
                    JOIN positions ON interviews.position_id = positions.id
                    ORDER BY date DESC LIMIT ? OFFSET ?
                """,
                (per_page, offset)
            )
        rows = cursor.fetchall()
        conn.close()
        interviews = []
        for row in rows:
            interviews.append({
                "id": row["id"],
                "date": row["date"],
                "diarized": row["diarized"],
                "summary": row["summary"],
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
        cursor.execute("DELETE FROM positions WHERE id = ?", (position_id,))
        cursor.execute("DELETE FROM interviews WHERE position_id = ?", (position_id,))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao deletar cargo no banco de dados")
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    return JSONResponse(content={"message": "Cargo deletado com sucesso"})
