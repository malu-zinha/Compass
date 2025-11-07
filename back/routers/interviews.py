import json
import sqlite3
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from database import get_db_connection

router = APIRouter(
    prefix="/positions/interviews",
    tags=["Interviews"]
)

@router.post("/")
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

@router.get("/{position_id}")
def get_interviews_by_position(
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
                        interviews.transcript,
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
                        interviews.transcript,
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
                "transcript": bool(row["transcript"]),
                "labeled": json.loads(row["labeled"]) if row["labeled"] else "",
                "analysis": json.loads(row["analysis"]) if row["analysis"] else "",
                "notes": row["notes"],
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

@router.delete("/{id}")
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
