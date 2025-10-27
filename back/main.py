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
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file TEXT,
            date TEXT,
            transcription TEXT,
            summary TEXT
        )
    """)
    conn.commit()
    conn.close()

def ensure_uploads_directory():
    """Cria a pasta uploads se ela não existir"""
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        print(f"✅ Pasta '{uploads_dir}' criada automaticamente")

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

create_table()
ensure_uploads_directory()

# Carregar prompts
with open('prompts/prompt_padrao.txt') as fin:
    PROMPT_PADRAO = fin.read()

with open('prompts/prompt_analitico.txt') as fin:
    PROMPT_ANALITICO = fin.read()

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

class InterviewCreateResponse(BaseModel):
    id: int
    message: str

class InterviewTranscribeRequest(BaseModel):
    id: int

class InterviewResumoRequest(BaseModel):
    id: int
    tipo_resumo: str = "padrao"

@app.post("/api/interviews", response_model=InterviewCreateResponse)
async def insert_interview(audio_file: UploadFile = File(...)):
    date = datetime.now().isoformat()
    file_location = f"uploads/{audio_file.filename}"
    with open(file_location, "wb") as f:
        f.write(await audio_file.read())
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO interviews (audio_file, date, transcription, summary)
            VALUES (?, ?, '', '')
        """, (file_location, date))
        conn.commit()
        interview_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao inserir entrevista no banco de dados")

    return InterviewCreateResponse(
        id=interview_id, 
        message="Entrevista registrada com sucesso!"
    )

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
            raise HTTPException(status_code=500, detail="Erro na transcrição do áudio")

    # Atualizar no banco
    cursor.execute("UPDATE interviews SET transcription = ? WHERE id = ?", (transcription, request.id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": request.id, "transcription": transcription, "message": "Transcrição salva com sucesso"})

@app.post("/gerar-resumo")
async def criar_resumo(request: InterviewResumoRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT transcription FROM interviews WHERE id = ?", (request.id,))
    row = cursor.fetchone()
    if not row or not row["transcription"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    transcricao = row["transcription"]
    prompt_template = PROMPT_PADRAO if request.tipo_resumo != "analitico" else PROMPT_ANALITICO
    prompt_final = prompt_template.format(DADOS_DA_TRANSCRICAO=transcricao)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt_final}],
        temperature=0.2
    )
    resumo_gerado = response.choices[0].message.content
    # Atualizar resumo no banco
    cursor.execute("UPDATE interviews SET summary = ? WHERE id = ?", (resumo_gerado, request.id))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": request.id, "summary": resumo_gerado, "message": "Resumo gerado e salvo com sucesso"})

@app.get("/api/interviews")
def get_interviews(
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(10, ge=1, le=100, description="Itens por página")
):
    offset = (page - 1) * per_page
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM interviews")
        total = cursor.fetchone()[0]
        cursor.execute(
            "SELECT id, date, transcription, summary FROM interviews ORDER BY date DESC LIMIT ? OFFSET ?", 
            (per_page, offset)
        )
        rows = cursor.fetchall()
        conn.close()
        interviews = []
        for row in rows:
            interviews.append({
                "id": row["id"],
                "date": row["date"],
                "transcription": row["transcription"],
                "summary": row["summary"]
            })
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao acessar o banco de dados")
    return JSONResponse(content={
        "interviews": interviews,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    })

@app.delete("/api/interviews/{id}")
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
