import os
from openai import AsyncOpenAI 
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from fastapi import Body
from dotenv import load_dotenv
import sqlite3
from fastapi.responses import JSONResponse
from datetime import datetime


load_dotenv()

app = FastAPI(
    title="API de Resumos de Entrevistas",
    description="Uma API para gerar resumos de transcrições usando o OpenAI GPT.",
    version="1.0.0"
)
DATABASE = './interviews.db'

# api_key = os.getenv("OPENAI_API_KEY")
# if not api_key:
#     raise ValueError("A variável de ambiente OPENAI_API_KEY não foi definida. Verifique o .env.")
#
# client = AsyncOpenAI(api_key=api_key)

with open('prompts/prompt_padrao.txt') as fin:
    PROMPT_PADRAO = fin.read()

with open('prompts/prompt_analitico.txt') as fin:
    PROMPT_ANALITICO = fin.read()

class ResumoRequest(BaseModel):
    transcricao: str
    tipo_resumo: str = 'padrao'

class ResumoResponse(BaseModel):
    resumo: str

@app.post("/gerar-resumo", response_model=ResumoResponse)
async def criar_resumo(request_data: ResumoRequest):

    if request_data.tipo_resumo == 'analitico':
        prompt_template = PROMPT_ANALITICO
    else:
        prompt_template = PROMPT_PADRAO

        prompt_final = prompt_template.format(DADOS_DA_TRANSCRICAO=request_data.transcricao)
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": prompt_final}
            ],
            temperature=0.2
        )
        
        resumo_gerado = response.choices[0].message.content
        
        return ResumoResponse(resumo=resumo_gerado)

def create_table():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transcription TEXT,
            audio_file TEXT,
            audio_transcription TEXT,
            summary TEXT,
            date TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

create_table()

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
            """
            SELECT id, date, summary
            FROM interviews
            ORDER BY date DESC
            LIMIT ? OFFSET ?
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

@app.post("/api/interviews")
def insert_interview(
    transcription: str = Body(..., embed=True),
    audio_file: str = Body(..., embed=True),
    audio_transcription: str = Body(..., embed=True),
    summary: str = Body(..., embed=True),
    date: str = Body(default=datetime.now().isoformat(), embed=True)
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO interviews (transcription, audio_file, audio_transcription, summary, date)
            VALUES (?, ?, ?, ?, ?)
        """, (transcription, audio_file, audio_transcription, summary, date))
        conn.commit()
        interview_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao inserir entrevista no banco de dados")

    return JSONResponse(content={
        "id": interview_id,
        "message": "Entrevista inserida com sucesso!"
    })

