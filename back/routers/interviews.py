import json
import sqlite3
import os
import mimetypes
from datetime import datetime
from models import InterviewCreateRequest
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from database import get_db_connection

router = APIRouter(
    prefix="/positions/interviews",
    tags=["Interviews"]
)

@router.post("/candidate")
def insert_interview(request: InterviewCreateRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO interviews (
                name,
                email,
                number,
                notes,
                transcript,
                analysis,
                score,
                position_id
            )
            VALUES (?, ?, ?, '', '', '', '', ?)
        """, (request.name, request.email, request.number, request.position_id))
        conn.commit()
        row_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir candidato no banco de dados: {e}")

    return JSONResponse(content={
        "id": row_id,
        "message": "Candidato registrado com sucesso!"
    })

@router.post("/")
async def insert_interview_audio(id: int, audio: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)

    date = datetime.now().isoformat()
    base_filename, ext = os.path.splitext(audio.filename)
    safe_filename = f"interview_{id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{ext}"
    audio_file = f"uploads/{safe_filename}"
    
    with open(audio_file, "wb") as f:
        f.write(await audio.read())
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE interviews SET
                audio_file = ?,
                date = ?
            WHERE id = ?""",
            (audio_file, date, id)
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir áudio no banco de dados: {e}")

    return JSONResponse(content={
        "id": id,
        "message": "Áudio registrado com sucesso!"
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
                        interviews.audio_file,
                        interviews.transcript,
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
                        interviews.audio_file,
                        interviews.date,
                        interviews.transcript,
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
                "audio_file": row["audio_file"],
                "transcript": json.loads(row["transcript"]) if row["transcript"] else "",
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

@router.get("/audio/{id}")
def download_interview_audio(id: int):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Entrevista não encontrada.")

        audio_file = row["audio_file"]

        if not audio_file or not os.path.exists(audio_file):
            raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado no servidor.")

        media_type, _ = mimetypes.guess_type(audio_file)
        if media_type is None:
            media_type = "application/octet-stream"

        filename = os.path.basename(audio_file)

        return FileResponse(
            path=audio_file,
            filename=filename,
            media_type=media_type
        )

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
    finally:
        if conn:
            conn.close()


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
