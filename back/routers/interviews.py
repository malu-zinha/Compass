import json
import sqlite3
import os
import mimetypes
import asyncio
from datetime import datetime
from models import InterviewCreateRequest, QuestionCreateRequest, NotesUpdateRequest
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
            VALUES (?, ?, ?, ?, '', '', '', ?)
        """, (request.name, request.email, request.number, request.notes or '', request.position_id))
        conn.commit()
        row_id = cursor.lastrowid
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir candidato no banco de dados: {e}")

    return JSONResponse(content={
        "id": row_id,
        "message": "Candidato registrado com sucesso!"
    })

@router.post("/{id}/audio-file")
async def insert_interview_audio(id: int, audio: UploadFile = File(...)):
    import time
    start_time = time.time()
    
    print(f"\n{'='*80}")
    print(f"[DEBUG] 📥 Recebendo áudio para interview ID: {id} (endpoint /audio-file)")
    print(f"{'='*80}")
    
    # Verificar se a entrevista existe
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM interviews WHERE id = ?", (id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        print(f"[ERROR] ❌ Interview {id} não encontrado")
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    
    try:
        os.makedirs("uploads", exist_ok=True)

        date = datetime.now().isoformat()
        base_filename, ext = os.path.splitext(audio.filename)
        safe_filename = f"interview_{id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
        audio_file = f"uploads/{safe_filename}"
        
        print(f"[DEBUG] 💾 Salvando áudio em: {audio_file}")
        start_save = time.time()
        
        with open(audio_file, "wb") as f:
            content = await audio.read()
            f.write(content)
        
        save_time = time.time() - start_save
        file_size = os.path.getsize(audio_file)
        file_size_mb = file_size / 1024 / 1024
        
        print(f"[TIMING] ⏱️  Salvamento levou: {save_time:.2f}s")
        print(f"[DEBUG] ✅ Áudio salvo: {file_size_mb:.2f} MB ({file_size} bytes)")
        print(f"[DEBUG] 📁 Formato: {ext.upper() if ext else 'DESCONHECIDO'}")
        
        cursor.execute(
            """UPDATE interviews SET
                audio_file = ?,
                date = ?
            WHERE id = ?""",
            (audio_file, date, id)
        )
        conn.commit()
        conn.close()
        
        total_time = time.time() - start_time
        print(f"[TIMING] ⏱️  Upload total: {total_time:.2f}s")
        print(f"{'='*80}\n")
        
        # Iniciar transcrição em background
        print(f"[DEBUG] 🚀 Iniciando transcrição em background para interview {id}")
        print(f"[DEBUG] 📤 Vai enviar para AssemblyAI em breve...")
        
        # Importar a função de transcrição do outro router
        from routers.interview_processing import transcribe_audio_background
        asyncio.create_task(transcribe_audio_background(id, audio_file))
        
        print(f"[DEBUG] ✅ Task de transcrição criada e rodando em background")
        
    except sqlite3.Error as e:
        conn.close()
        print(f"[ERROR] ❌ Erro ao inserir áudio no banco de dados: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao inserir áudio no banco de dados: {e}")
    except Exception as e:
        if conn:
            conn.close()
        print(f"[ERROR] ❌ Erro ao processar upload: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")

    return JSONResponse(content={
        "id": id,
        "message": "Áudio registrado com sucesso! Transcrição iniciada em background."
    })

@router.post("/questions")
def insert_question(request: QuestionCreateRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) FROM interviews WHERE id = ?
            """,
            (request.interview_id,)
        )
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Entrevista não encontrada")

        cursor.execute(
            """
                INSERT INTO questions (
                    question,
                    interview_id
                )
                VALUES (?, ?)
            """,
            (request.question, request.interview_id)
        )
        qid = cursor.lastrowid
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inserir pergunta no banco de dados: {e}")
    finally:
        conn.close()

    return JSONResponse(content={
        "id": qid,
        "message": "Pergunta registrada com sucesso"
    })

@router.get("/{id}/questions")
def get_questions(id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
                SELECT id, question, interview_id FROM questions WHERE interview_id = ?
            """,
            (id,)
        )
        rows = cursor.fetchall()
        question_list = [{"id": row["id"], "question": row["question"], "interview_id": row["interview_id"]} for row in rows]
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar perguntas: {e}")
    finally:
        conn.close()
    return JSONResponse(content=question_list)

@router.delete("/questions/{question_id}")
def delete_questions(question_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
                DELETE FROM questions WHERE id = ?
            """,
            (question_id,)
        )
        deleted = cursor.rowcount
        conn.commit()
    except sqlite3.Error:
        raise HTTPException(status_code=500, detail="Erro ao deletar pergunta no banco de dados")
    finally:
        conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")

    return JSONResponse(content={"message": "Pergunta deletada com sucesso"})


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
                        interviews.duration,
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
                        interviews.duration,
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
            # Parse seguro do transcript
            transcript = ""
            if row["transcript"]:
                try:
                    transcript = json.loads(row["transcript"])
                    # Verificar se tem diarização (speakers A/B)
                    if isinstance(transcript, dict) and transcript.get("utterances"):
                        utterances = transcript["utterances"]
                        has_diarization = any(
                            utt.get("speaker") and 
                            (str(utt.get("speaker")).upper() in ['A', 'B'])
                            for utt in utterances
                        )
                        print(f"[DEBUG] 📋 Interview {row['id']}: transcript tem {len(utterances)} utterances, diarização: {has_diarization}")
                    elif isinstance(transcript, list):
                        has_diarization = any(
                            utt.get("speaker") and 
                            (str(utt.get("speaker")).upper() in ['A', 'B'])
                            for utt in transcript
                        )
                        print(f"[DEBUG] 📋 Interview {row['id']}: transcript tem {len(transcript)} utterances, diarização: {has_diarization}")
                except (json.JSONDecodeError, TypeError):
                    print(f"[WARNING] Erro ao parsear transcript da entrevista {row['id']}, usando string vazia")
                    transcript = ""
            
            # Parse seguro do analysis
            analysis = ""
            if row["analysis"]:
                try:
                    analysis = json.loads(row["analysis"])
                except (json.JSONDecodeError, TypeError):
                    print(f"[WARNING] Erro ao parsear analysis da entrevista {row['id']}, usando string vazia")
                    analysis = ""
            
            # 🚨 LOG CRÍTICO: verificar diarização antes de enviar para o frontend
            if transcript:
                if isinstance(transcript, dict) and transcript.get("utterances"):
                    utterances = transcript["utterances"]
                    sample_speakers = [u.get("speaker") for u in utterances[:5]]
                    all_speakers = list(set([u.get("speaker") for u in utterances]))
                    has_diarization_check = any(s in ['A', 'B'] for s in all_speakers if s)
                    print(f"[DEBUG] 🌐 Enviando para frontend - Interview {row['id']}:")
                    print(f"         - Tipo: dict com utterances")
                    print(f"         - Total utterances: {len(utterances)}")
                    print(f"         - Primeiros 5 speakers: {sample_speakers}")
                    print(f"         - Todos speakers únicos: {all_speakers}")
                    print(f"         - TEM DIARIZAÇÃO: {'✅ SIM' if has_diarization_check else '❌ NÃO'}")
                elif isinstance(transcript, list):
                    sample_speakers = [u.get("speaker") for u in transcript[:5]]
                    all_speakers = list(set([u.get("speaker") for u in transcript]))
                    has_diarization_check = any(s in ['A', 'B'] for s in all_speakers if s)
                    print(f"[DEBUG] 🌐 Enviando para frontend - Interview {row['id']}:")
                    print(f"         - Tipo: list")
                    print(f"         - Total utterances: {len(transcript)}")
                    print(f"         - Primeiros 5 speakers: {sample_speakers}")
                    print(f"         - Todos speakers únicos: {all_speakers}")
                    print(f"         - TEM DIARIZAÇÃO: {'✅ SIM' if has_diarization_check else '❌ NÃO'}")
            
            interviews.append({
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "number": row["number"],
                "date": row["date"],
                "audio_file": row["audio_file"],
                "transcript": transcript,
                "analysis": analysis,
                "notes": row["notes"],
                "score": row["score"],
                "duration": row["duration"] if row["duration"] else None,
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
        print(f"\n[DEBUG] 🎵 Requisição de áudio para interview ID: {id}")
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
        row = cursor.fetchone()

        if not row:
            print(f"[ERROR] ❌ Entrevista {id} não encontrada no banco")
            raise HTTPException(status_code=404, detail="Entrevista não encontrada.")

        audio_file = row["audio_file"]
        print(f"[DEBUG] 📁 Caminho no banco: {audio_file}")

        if not audio_file:
            print(f"[ERROR] ❌ Campo audio_file está vazio no banco")
            raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado no servidor.")

        # Converter para caminho absoluto se necessário
        if not os.path.isabs(audio_file):
            audio_file = os.path.join(os.getcwd(), audio_file)
        
        print(f"[DEBUG] 📍 Caminho absoluto: {audio_file}")
        print(f"[DEBUG] 📂 Working directory: {os.getcwd()}")

        if not os.path.exists(audio_file):
            print(f"[ERROR] ❌ Arquivo não existe no disco!")
            raise HTTPException(status_code=404, detail=f"Arquivo de áudio não encontrado no servidor: {audio_file}")

        file_size = os.path.getsize(audio_file) / 1024  # KB
        print(f"[DEBUG] 📦 Tamanho do arquivo: {file_size:.2f} KB")

        media_type, _ = mimetypes.guess_type(audio_file)
        if media_type is None:
            media_type = "audio/mpeg"  # Default para MP3
        
        print(f"[DEBUG] 🎧 Media type: {media_type}")

        filename = os.path.basename(audio_file)
        print(f"[DEBUG] ✅ Servindo arquivo: {filename}")

        response = FileResponse(
            path=audio_file,
            filename=filename,
            media_type=media_type
        )
        
        # Adicionar headers CORS
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        # Headers para player de áudio funcionar corretamente
        response.headers["Accept-Ranges"] = "bytes"
        response.headers["Cache-Control"] = "no-cache"
        
        print(f"[DEBUG] 📤 Headers enviados: Accept-Ranges=bytes, Media-Type={media_type}")
        
        return response

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {e}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.patch("/{id}/notes")
def update_interview_notes(id: int, notes_data: NotesUpdateRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE interviews SET notes = ? WHERE id = ?",
            (notes_data.notes, id)
        )
        conn.commit()
        updated = cursor.rowcount
        conn.close()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar anotações: {e}")
    
    if updated == 0:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    
    return JSONResponse(content={"message": "Anotações atualizadas com sucesso"})

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
