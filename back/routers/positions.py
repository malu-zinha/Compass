import json
import sqlite3
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from database import get_db_connection
from models import PositionCreateRequest

router = APIRouter(
    tags=["Positions"]
)

@router.post("/positions")
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

@router.get("/positions")
def get_positions(
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

@router.delete("/positions{position_id}")
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
