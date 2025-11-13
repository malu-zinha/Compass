import sqlite3
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter(
    prefix="/questions",
    tags=["Global Questions"]
)

class GlobalQuestionCreateRequest(BaseModel):
    question: str
    position_id: int | None = None

@router.post("")
def create_global_question(request: GlobalQuestionCreateRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO global_questions (question, position_id)
            VALUES (?, ?)
            """,
            (request.question, request.position_id)
        )
        qid = cursor.lastrowid
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir pergunta: {e}")

    return JSONResponse(content={
        "id": qid,
        "message": "Pergunta registrada com sucesso"
    })

@router.get("")
def get_global_questions(position_id: int = Query(None)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if position_id:
            cursor.execute(
                """
                SELECT id, question, position_id, created_at FROM global_questions
                WHERE position_id = ?
                ORDER BY id DESC
                """,
                (position_id,)
            )
        else:
            cursor.execute(
                """
                SELECT id, question, position_id, created_at FROM global_questions
                WHERE position_id IS NULL
                ORDER BY id DESC
                """
            )
        rows = cursor.fetchall()
        questions = [{"id": row["id"], "question": row["question"], "position_id": row["position_id"], "created_at": row["created_at"]} for row in rows]
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar perguntas: {e}")
    
    return JSONResponse(content={"questions": questions})

@router.delete("/{question_id}")
def delete_global_question(question_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM global_questions WHERE id = ?", (question_id,))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao deletar pergunta")
    
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")
    
    return JSONResponse(content={"message": "Pergunta deletada com sucesso"})

