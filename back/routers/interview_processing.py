import json
import os
import sqlite3
import assemblyai as aai
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File
from fastapi.responses import JSONResponse
from database import get_db_connection
import asyncio
from datetime import datetime
from openai import AsyncOpenAI
import aiofiles
from dotenv import load_dotenv
import websockets
import base64
import struct

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

aai.settings.api_key = ASSEMBLYAI_API_KEY
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

router = APIRouter(
    prefix="/positions/interviews",
    tags=["Interview Processing"]
)


with open("prompts/prompt_analitico.txt", "r") as f:
    prompt_template = f.read()

@router.patch("/{id}/process/analysis")
async def generate_analysis(id: int):
    import time
    start_total = time.time()
    
    print(f"\n{'='*80}")
    print(f"[DEBUG] ⏱️  INICIANDO generate_analysis para interview ID: {id}")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
            SELECT
                interviews.transcript,
                interviews.notes,
                interviews.audio_file,
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
    if not row:
        conn.close()
        print(f"[ERROR] ❌ Interview {id} não encontrado no banco")
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    
    # Verificar se há transcript e se tem diarização
    has_transcript = bool(row["transcript"])
    has_audio = bool(row["audio_file"] and os.path.exists(row["audio_file"]))
    
    # Verificar se a transcrição tem diarização
    has_diarization = False
    if has_transcript:
        try:
            transcript_parsed = json.loads(row["transcript"])
            utterances = transcript_parsed.get("utterances", []) if isinstance(transcript_parsed, dict) else transcript_parsed
            if isinstance(utterances, list) and len(utterances) > 0:
                speakers = set([utt.get("speaker", "").upper() for utt in utterances if utt.get("speaker")])
                has_diarization = len(speakers) > 1 and all(s in ['A', 'B'] for s in speakers if s)
        except:
            pass
    
    print(f"[INFO] 📊 Status inicial:")
    print(f"  - Transcript existe: {'✅ SIM' if has_transcript else '❌ NÃO'}")
    print(f"  - Tem diarização: {'✅ SIM' if has_diarization else '❌ NÃO'}")
    print(f"  - Áudio existe: {'✅ SIM' if has_audio else '❌ NÃO'}")
    if has_audio:
        audio_size = os.path.getsize(row["audio_file"]) / 1024 / 1024  # MB
        print(f"  - Tamanho do áudio: {audio_size:.2f} MB")
        print(f"  - Formato: {os.path.splitext(row['audio_file'])[1]}")
    
    # Se tem áudio mas não tem diarização, aguardar um pouco pela transcrição em background
    if has_audio and has_transcript and not has_diarization:
        print(f"\n[INFO] ⏳ Transcrição existe mas SEM diarização adequada")
        print(f"[INFO] 🔄 Aguardando transcrição em background COM diarização...")
        print(f"[INFO] ⏱️  Esperando até 30 segundos...")
        
        # Aguardar até 30 segundos pela transcrição com diarização
        wait_time = 0
        max_wait = 30  # 30 segundos
        while wait_time < max_wait:
            await asyncio.sleep(2)
            wait_time += 2
            
            # Verificar se a transcrição foi atualizada
            cursor.execute("SELECT transcript FROM interviews WHERE id = ?", (id,))
            check_row = cursor.fetchone()
            if check_row and check_row["transcript"]:
                try:
                    check_parsed = json.loads(check_row["transcript"])
                    check_utts = check_parsed.get("utterances", []) if isinstance(check_parsed, dict) else check_parsed
                    if isinstance(check_utts, list) and len(check_utts) > 0:
                        check_speakers = set([u.get("speaker", "").upper() for u in check_utts if u.get("speaker")])
                        check_has_diarization = len(check_speakers) > 1 and all(s in ['A', 'B'] for s in check_speakers if s)
                        if check_has_diarization:
                            print(f"[INFO] ✅ Transcrição COM diarização detectada após {wait_time}s!")
                            # Atualizar row com a nova transcrição
                            row = dict(row)
                            row["transcript"] = check_row["transcript"]
                            has_diarization = True
                            break
                except:
                    pass
            
            if wait_time % 10 == 0:
                print(f"[INFO] ⏳ Aguardando... {wait_time}/{max_wait}s")
        
        if not has_diarization:
            print(f"[WARNING] ⚠️  Timeout: transcrição com diarização não apareceu em {max_wait}s")
            print(f"[WARNING] ⚠️  Prosseguindo com a transcrição existente (sem diarização adequada)")
    
    # Se não houver transcript, tentar fazer transcrição do áudio
    if not has_transcript:
        print(f"\n[WARNING] ⚠️  Transcript não encontrado - transcrição em tempo real FALHOU ou não foi salva!")
        print(f"[INFO] 🎙️  Iniciando transcrição completa do áudio...")
        
        audio_file = row["audio_file"]
        if not has_audio:
            conn.close()
            print(f"[ERROR] ❌ Arquivo de áudio não encontrado para interview {id}")
            raise HTTPException(status_code=404, detail="Transcrição e arquivo de áudio não encontrados")
        
        # Fazer transcrição completa do áudio
        try:
            start_transcription = time.time()
            
            config = aai.TranscriptionConfig(
                speaker_labels=True,
                speakers_expected=2,
                language_code="pt"
            )
            print(f"[DEBUG] 📤 Enviando áudio para AssemblyAI: {audio_file}")
            transcriber = aai.Transcriber(config=config)
            transcript = transcriber.transcribe(audio_file)
            
            transcription_time = time.time() - start_transcription
            print(f"[TIMING] ⏱️  Transcrição levou: {transcription_time:.2f}s")
            
            if transcript.status == "completed" and transcript.utterances:
                print(f"[DEBUG] ✅ Transcrição completa com {len(transcript.utterances)} utterances")
                transcript_data = {"utterances": []}
                for utt in transcript.utterances:
                    # Converter speaker para formato consistente (A, B, C...)
                    # AssemblyAI pode retornar como string "A", "B" ou como número 0, 1
                    speaker = utt.speaker
                    if isinstance(speaker, (int, float)):
                        # Converter número para letra: 0 -> A, 1 -> B, etc.
                        speaker = chr(65 + int(speaker))  # 65 é o código ASCII de 'A'
                    elif isinstance(speaker, str):
                        speaker = speaker.upper()
                    else:
                        speaker = "A"  # Fallback
                    
                    print(f"[DEBUG] Speaker original: {utt.speaker}, convertido: {speaker}")
                    
                    utt_dict = {
                        "speaker": speaker,
                        "text": utt.text,
                        "start": utt.start,
                        "end": utt.end,
                    }
                    transcript_data["utterances"].append(utt_dict)
                
                # Salvar transcript no banco
                transcript_json = json.dumps(transcript_data)
                cursor.execute(
                    "UPDATE interviews SET transcript = ? WHERE id = ?", (transcript_json, id)
                )
                conn.commit()
                print(f"[DEBUG] 💾 Transcript salvo no banco para interview {id}")
                
                # Atualizar row com o novo transcript
                row = dict(row)
                row["transcript"] = transcript_json
            else:
                conn.close()
                print(f"[ERROR] ❌ Falha na transcrição: {transcript.status}")
                raise HTTPException(status_code=500, detail="Falha ao transcrever o áudio")
        except Exception as e:
            conn.close()
            print(f"[ERROR] ❌ Erro ao transcrever áudio: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao transcrever áudio: {str(e)}")
    else:
        print(f"\n[INFO] ✅ Usando transcript da transcrição em tempo real (já salvo no banco)")
        transcript_data = json.loads(row["transcript"])
        print(f"[INFO] 📝 Transcript contém {len(transcript_data.get('utterances', []))} utterances")
    
    # Extrair array de utterances do transcript (pode estar como objeto {"utterances": [...]} ou como array direto)
    transcript_parsed = json.loads(row["transcript"])
    if isinstance(transcript_parsed, dict) and "utterances" in transcript_parsed:
        transcript_array = transcript_parsed["utterances"]
    elif isinstance(transcript_parsed, list):
        transcript_array = transcript_parsed
    else:
        transcript_array = []
    
    print(f"[DEBUG] 📋 Enviando {len(transcript_array)} utterances para análise")
    
    # Verificar se há utterances suficientes
    if len(transcript_array) == 0:
        conn.close()
        print(f"[ERROR] ❌ Nenhuma utterance encontrada no transcript!")
        raise HTTPException(status_code=400, detail="Transcript vazio. Não é possível gerar análise sem transcrição.")
    
    # Log de amostra das primeiras utterances
    if len(transcript_array) > 0:
        print(f"[DEBUG] 📝 Primeira utterance: Speaker={transcript_array[0].get('speaker', 'N/A')}, Text='{transcript_array[0].get('text', '')[:50]}...'")
        print(f"[DEBUG] 📝 Última utterance: Speaker={transcript_array[-1].get('speaker', 'N/A')}, Text='{transcript_array[-1].get('text', '')[:50]}...'")
    
    interview_info = {
        "position_data": {
            "position": row["position"],
            "skills": json.loads(row["skills"]),
            "description": row["description"]
        },
        "transcript": transcript_array,  # Enviar apenas o array, não o objeto
        "notes": row["notes"]
    }
    info_json = json.dumps(interview_info)

    prompt_final = prompt_template + info_json

    prompt_size_kb = len(prompt_final) / 1024
    print(f"\n[INFO] 🤖 Iniciando geração de análise com GPT-4o-mini")
    print(f"[DEBUG] 📏 Tamanho do prompt: {len(prompt_final)} caracteres ({prompt_size_kb:.2f} KB)")
    
    start_gpt = time.time()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt_final}],
        response_format={ "type": "json_object" },
        temperature=0.5
            ),
            timeout=120.0  # Timeout de 2 minutos
        )
        gpt_time = time.time() - start_gpt
        print(f"[TIMING] ⏱️  GPT-4o-mini levou: {gpt_time:.2f}s")
        print(f"[DEBUG] ✅ Análise gerada com sucesso")
    except asyncio.TimeoutError:
        conn.close()
        print(f"[ERROR] ❌ TIMEOUT ao gerar análise (>120s)")
        raise HTTPException(status_code=504, detail="Timeout ao gerar análise. Tente novamente.")
    except Exception as e:
        conn.close()
        print(f"[ERROR] ❌ Erro ao gerar análise: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar análise: {str(e)}")
    
    json_gerado = response.choices[0].message.content
    print(f"[DEBUG] 📄 JSON retornado pelo GPT (primeiros 500 chars): {json_gerado[:500]}...")
    
    try:
        dictionary = json.loads(json_gerado)
    except json.JSONDecodeError as e:
        conn.close()
        print(f"[ERROR] ❌ Erro ao fazer parse do JSON retornado pelo GPT: {e}")
        print(f"[ERROR] JSON completo: {json_gerado}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar resposta do GPT: {str(e)}")
    
    # Validar campos obrigatórios e garantir que não estão vazios
    required_fields = ["summary", "positives", "negatives", "skills", "experiences", "score"]
    missing_fields = [field for field in required_fields if field not in dictionary]
    if missing_fields:
        print(f"[WARNING] ⚠️ Campos faltando na resposta do GPT: {missing_fields}")
    
    # Preencher campos faltando ou vazios com valores padrão
    if "positives" not in dictionary or not dictionary.get("positives") or len(dictionary.get("positives", [])) == 0:
        print(f"[WARNING] ⚠️ Positives vazio ou faltando, preenchendo com valor padrão")
        dictionary["positives"] = ["Nenhuma informação coletada"]
    if "negatives" not in dictionary or not dictionary.get("negatives") or len(dictionary.get("negatives", [])) == 0:
        print(f"[WARNING] ⚠️ Negatives vazio ou faltando, preenchendo com valor padrão")
        dictionary["negatives"] = ["Nenhuma informação coletada"]
    if "skills" not in dictionary or not dictionary.get("skills") or len(dictionary.get("skills", [])) == 0:
        print(f"[WARNING] ⚠️ Skills vazio ou faltando, preenchendo com valor padrão")
        dictionary["skills"] = ["Nenhuma informação coletada"]
    if "experiences" not in dictionary or not dictionary.get("experiences") or len(dictionary.get("experiences", [])) == 0:
        print(f"[WARNING] ⚠️ Experiences vazio ou faltando, preenchendo com valor padrão")
        dictionary["experiences"] = [{"company": "Nenhuma informação coletada", "role": "Nenhuma informação coletada", "description": "Nenhuma informação coletada"}]
    if "summary" not in dictionary or not dictionary.get("summary"):
        print(f"[WARNING] ⚠️ Summary vazio ou faltando, preenchendo com valor padrão")
        dictionary["summary"] = "Nenhuma informação coletada"
    if "score" not in dictionary or not dictionary.get("score"):
        print(f"[WARNING] ⚠️ Score faltando, preenchendo com valor padrão")
        dictionary["score"] = {"overall": 0, "subscores": {"technical": 0, "communication": 0, "work_culture": 0, "experience": 0}}
    
    # Re-gerar JSON com campos preenchidos (se necessário)
    if missing_fields or any([
        len(dictionary.get("positives", [])) == 0,
        len(dictionary.get("negatives", [])) == 0,
        len(dictionary.get("skills", [])) == 0,
        len(dictionary.get("experiences", [])) == 0
    ]):
        json_gerado = json.dumps(dictionary, ensure_ascii=False)
    
    print(f"[DEBUG] ✅ Análise parseada com sucesso:")
    print(f"  - Positives: {len(dictionary.get('positives', []))} itens")
    print(f"  - Negatives: {len(dictionary.get('negatives', []))} itens")
    print(f"  - Skills: {len(dictionary.get('skills', []))} itens")
    print(f"  - Experiences: {len(dictionary.get('experiences', []))} itens")
    print(f"  - Score overall: {dictionary.get('score', {}).get('overall', 0)}")
    
    cursor.execute("UPDATE interviews SET analysis = ?, score = ? WHERE id = ?", (json_gerado, dictionary["score"]["overall"], id))
    conn.commit()
    conn.close()
    
    total_time = time.time() - start_total
    print(f"\n{'='*80}")
    print(f"[TIMING] ⏱️  TEMPO TOTAL: {total_time:.2f}s")
    print(f"{'='*80}\n")
    
    return JSONResponse(content={"id": id, "analysis": dictionary, "message": "Resumo gerado e salvo com sucesso"})

@router.post("/{id}/upload-audio")
async def upload_audio(id: int, audio: UploadFile = File(...), duration: str = None):
    """Recebe e salva o arquivo de áudio da entrevista em tempo real"""
    import time
    start_time = time.time()
    
    print(f"\n{'='*80}")
    print(f"[DEBUG] 📥 Recebendo áudio para interview ID: {id}")
    if duration:
        print(f"[DEBUG] ⏱️  Duração informada pelo frontend: {duration}s")
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
        # Criar diretório de uploads se não existir
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Manter extensão original do arquivo (webm ou wav)
        original_extension = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        audio_filename = f"interview_{id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{original_extension}"
        audio_path = os.path.join(upload_dir, audio_filename)
        
        # Salvar arquivo
        print(f"[DEBUG] 💾 Salvando áudio em: {audio_path}")
        start_save = time.time()
        async with aiofiles.open(audio_path, 'wb') as f:
            content = await audio.read()
            await f.write(content)
        save_time = time.time() - start_save
        
        file_size = os.path.getsize(audio_path)
        file_size_mb = file_size / 1024 / 1024
        print(f"[TIMING] ⏱️  Salvamento levou: {save_time:.2f}s")
        print(f"[DEBUG] ✅ Áudio salvo: {file_size_mb:.2f} MB ({file_size} bytes)")
        print(f"[DEBUG] 📁 Formato: {original_extension.upper()}")
        
        # Atualizar banco de dados com o caminho do áudio e duração (se fornecida)
        if duration:
            try:
                duration_float = float(duration)
                cursor.execute(
                    "UPDATE interviews SET audio_file = ?, date = ?, duration = ? WHERE id = ?",
                    (audio_path, datetime.now().isoformat(), duration_float, id)
                )
                print(f"[DEBUG] 💾 Duração salva no banco: {duration_float}s")
            except:
                cursor.execute(
                    "UPDATE interviews SET audio_file = ?, date = ? WHERE id = ?",
                    (audio_path, datetime.now().isoformat(), id)
                )
        else:
            cursor.execute(
                "UPDATE interviews SET audio_file = ?, date = ? WHERE id = ?",
                (audio_path, datetime.now().isoformat(), id)
            )
        
        conn.commit()
        conn.close()
        
        total_time = time.time() - start_time
        print(f"[TIMING] ⏱️  Upload total: {total_time:.2f}s")
        print(f"{'='*80}\n")
        
        # Iniciar transcrição em background (não bloqueia a resposta)
        asyncio.create_task(transcribe_audio_background(id, audio_path))
        
        # Retornar duração se foi fornecida
        response_data = {
            "message": "Áudio recebido e salvo com sucesso",
            "file_size": file_size,
            "audio_path": audio_path
        }
        
        if duration:
            try:
                response_data["duration"] = float(duration)
                print(f"[DEBUG] 📊 Duração salva na resposta: {duration}s")
            except:
                pass
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        conn.close()
        print(f"[ERROR] ❌ Erro ao salvar áudio: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar áudio: {str(e)}")

with open("prompts/prompt_questions.txt", "r") as f:
    original_prompt_template = f.read()

def get_utterances_last_n_seconds(data, n_seconds):
    if not data.get("utterances"):
        return []
    cutoff_time = max(utt["end"] for utt in data["utterances"]) - n_seconds
    return [utt for utt in data["utterances"] if utt["end"] >= cutoff_time]

def append_transcript_to_prompt(prompt, utterances):
    transcript_text = "\n".join(
        [f"Speaker {utt['speaker']}: {utt['text']}" for utt in utterances]
    )
    return prompt + "\n\n" + transcript_text

async def save_transcript_to_db(id: int, transcript_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    transcript_json_text = json.dumps(transcript_data)
    cursor.execute(
        "UPDATE interviews SET transcript = ? WHERE id = ?", (transcript_json_text, id)
    )
    conn.commit()
    conn.close()

async def transcribe_audio_background(interview_id: int, audio_path: str):
    """Transcreve áudio em background após upload com diarização completa"""
    try:
        print(f"\n{'='*80}")
        print(f"[BACKGROUND] 🎙️ Iniciando transcrição COMPLETA em background para interview {interview_id}")
        print(f"[BACKGROUND] 📝 Esta transcrição COM DIARIZAÇÃO substituirá a transcrição em tempo real")
        print(f"{'='*80}\n")
        
        # Aguardar um pouco para garantir que o arquivo foi salvo completamente
        await asyncio.sleep(2)
        
        if not os.path.exists(audio_path):
            print(f"[BACKGROUND] ⚠️ Arquivo de áudio não encontrado: {audio_path}")
            return
        
        file_size_mb = os.path.getsize(audio_path) / 1024 / 1024
        print(f"[BACKGROUND] 📁 Tamanho do arquivo: {file_size_mb:.2f} MB")
        print(f"[BACKGROUND] 📤 Enviando para AssemblyAI com diarização (speakers=2)...")
        
        config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )
        
        import time
        start_time = time.time()
        transcript = aai.Transcriber(config=config).transcribe(audio_path)
        transcription_time = time.time() - start_time
        
        print(f"[BACKGROUND] ⏱️  Transcrição levou {transcription_time:.2f}s")
        print(f"[BACKGROUND] Status: {transcript.status}")
        
        if transcript.status == "error":
            print(f"[BACKGROUND] ❌ Erro na transcrição: {transcript.error}")
            return
        
        if transcript.status == "completed" and transcript.utterances:
            print(f"[BACKGROUND] ✅ Transcrição completa com {len(transcript.utterances)} utterances")
            
            utt_list = []
            speakers_found = set()
            
            for utt in transcript.utterances:
                # Converter speaker para formato consistente (A, B, C...)
                speaker = utt.speaker
                if isinstance(speaker, (int, float)):
                    speaker = chr(65 + int(speaker))
                elif isinstance(speaker, str):
                    speaker = speaker.upper()
                else:
                    speaker = "A"
                
                speakers_found.add(speaker)
                
                utt_dict = {
                    "speaker": speaker,
                    "text": utt.text,
                    "start": utt.start,
                    "end": utt.end
                }
                utt_list.append(utt_dict)
            
            print(f"[BACKGROUND] 👥 Speakers identificados: {sorted(speakers_found)}")
            print(f"[BACKGROUND] 📊 Total de utterances: {len(utt_list)}")
            
            # Verificar se realmente tem diarização
            has_diarization = len(speakers_found) > 1 and all(s in ['A', 'B'] for s in speakers_found)
            if not has_diarization:
                print(f"[BACKGROUND] ⚠️  ATENÇÃO: Transcrição NÃO tem diarização adequada!")
                print(f"[BACKGROUND] ⚠️  Speakers encontrados: {speakers_found}")
            
            # Salvar no banco - SUBSTITUI a transcrição em tempo real
            transcript_data = {"utterances": utt_list}
            transcript_json = json.dumps(transcript_data)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # IMPORTANTE: Antes de salvar, verificar se já existe transcrição
            cursor.execute("SELECT transcript FROM interviews WHERE id = ?", (interview_id,))
            row = cursor.fetchone()
            old_transcript = row["transcript"] if row else None
            
            cursor.execute(
                "UPDATE interviews SET transcript = ? WHERE id = ?", 
                (transcript_json, interview_id)
            )
            conn.commit()
            conn.close()
            
            print(f"\n{'='*80}")
            print(f"[BACKGROUND] 💾 ✅ Transcrição DEFINITIVA COM DIARIZAÇÃO salva no banco!")
            print(f"[BACKGROUND] 📝 Interview ID: {interview_id}")
            print(f"[BACKGROUND] 🔄 Transcrição em tempo real SUBSTITUÍDA")
            print(f"[BACKGROUND] 👥 Speakers: {sorted(speakers_found)}")
            print(f"[BACKGROUND] 📊 Utterances: {len(utt_list)}")
            if old_transcript:
                try:
                    old_data = json.loads(old_transcript)
                    old_utts = old_data.get("utterances", []) if isinstance(old_data, dict) else old_data
                    print(f"[BACKGROUND] 📉 Utterances antigas (tempo real): {len(old_utts) if isinstance(old_utts, list) else 'N/A'}")
                except:
                    pass
            print(f"{'='*80}\n")
        else:
            print(f"[BACKGROUND] ⚠️ Transcrição não completada ou sem utterances")
            print(f"[BACKGROUND] Status: {transcript.status}")
            
    except Exception as e:
        print(f"[BACKGROUND] ❌ Erro na transcrição em background: {e}")
        import traceback
        traceback.print_exc()

def convert_pcm_to_wav(pcm_path: str, wav_path: str, sample_rate: int = 16000, channels: int = 1, sample_width: int = 2):
    """Converte arquivo PCM para WAV adicionando o header completo"""
    if not os.path.exists(pcm_path) or os.path.getsize(pcm_path) == 0:
        print(f"[PCM2WAV] ❌ Arquivo PCM não existe ou está vazio: {pcm_path}")
        return False
    
    try:
        print(f"[PCM2WAV] 🔄 Convertendo {pcm_path} → {wav_path}")
        
        with open(pcm_path, 'rb') as pcm_file:
            pcm_data = pcm_file.read()
        
        # Calcular tamanhos
        data_size = len(pcm_data)
        file_size = 36 + data_size
        
        print(f"[PCM2WAV] 📊 PCM data size: {data_size} bytes")
        print(f"[PCM2WAV] 📊 WAV file size: {file_size} bytes")
        print(f"[PCM2WAV] 🎵 Sample rate: {sample_rate}Hz, Channels: {channels}, Bit depth: {sample_width * 8}")
        
        # Criar header WAV completo
        with open(wav_path, 'wb') as wav_file:
            # RIFF header
            wav_file.write(b'RIFF')
            wav_file.write(struct.pack('<I', file_size))
            wav_file.write(b'WAVE')
            
            # fmt chunk (formato do áudio)
            wav_file.write(b'fmt ')
            wav_file.write(struct.pack('<I', 16))  # fmt chunk size (16 para PCM)
            wav_file.write(struct.pack('<H', 1))   # audio format (1 = PCM)
            wav_file.write(struct.pack('<H', channels))  # número de canais
            wav_file.write(struct.pack('<I', sample_rate))  # sample rate
            wav_file.write(struct.pack('<I', sample_rate * channels * sample_width))  # byte rate
            wav_file.write(struct.pack('<H', channels * sample_width))  # block align
            wav_file.write(struct.pack('<H', sample_width * 8))  # bits per sample
            
            # data chunk (dados de áudio)
            wav_file.write(b'data')
            wav_file.write(struct.pack('<I', data_size))
            wav_file.write(pcm_data)
        
        # Verificar se foi criado com sucesso
        if os.path.exists(wav_path):
            wav_size = os.path.getsize(wav_path)
            duration_seconds = data_size / (sample_rate * channels * sample_width)
            print(f"[PCM2WAV] ✅ WAV criado: {wav_size} bytes")
            print(f"[PCM2WAV] ⏱️  Duração estimada: {duration_seconds:.2f}s")
            return True
        else:
            print(f"[PCM2WAV] ❌ Arquivo WAV não foi criado")
            return False
            
    except Exception as e:
        print(f"[PCM2WAV] ❌ Erro ao converter PCM para WAV: {e}")
        import traceback
        traceback.print_exc()
        return False

@router.post("/{id}/transcribe_audio_file")
async def transcribe_audio_file(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row or not row["audio_file"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Audio file not found for this interview")

    audio_path = row["audio_file"]
    print(f"[DEBUG] Audio path: {audio_path}")

    if not os.path.exists(audio_path):
        conn.close()
        raise HTTPException(status_code=404, detail="Audio file not found on server")

    try:
        print(f"[DEBUG] Starting transcription for interview {id}")
        config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )

        print("[DEBUG] Sending to AssemblyAI...")
        transcript = aai.Transcriber(config=config).transcribe(audio_path)
        print(f"[DEBUG] Transcription status: {transcript.status}")

        if transcript.status == "error":
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")

        utt_list = []
        for utt in transcript.utterances:
            # Converter speaker para formato consistente (A, B, C...)
            # AssemblyAI pode retornar como string "A", "B" ou como número 0, 1
            speaker = utt.speaker
            if isinstance(speaker, (int, float)):
                # Converter número para letra: 0 -> A, 1 -> B, etc.
                speaker = chr(65 + int(speaker))  # 65 é o código ASCII de 'A'
            elif isinstance(speaker, str):
                speaker = speaker.upper()
            else:
                speaker = "A"  # Fallback
            
            print(f"[DEBUG] Speaker original: {utt.speaker}, convertido: {speaker}")
            
            utt_dict = {
                "speaker": speaker,
                "text": utt.text,
                "start": utt.start,
                "end": utt.end
            }
            utt_list.append(utt_dict)

        transcript_json = json.dumps(utt_list)

        cursor.execute(
            "UPDATE interviews SET transcript = ? WHERE id = ?", (transcript_json, id)
        )
        conn.commit()

    except HTTPException:
        conn.close()
        raise
    except Exception as e:
        conn.close()
        print(f"[ERROR] Exception type: {type(e).__name__}")
        print(f"[ERROR] Exception message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    conn.close()
    return JSONResponse(content={"id": id, "message": "Audio transcribed and transcript saved successfully", "transcript": utt_list})

@router.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket, id: int = Query(...)):
    await websocket.accept()
    print(f"[DEBUG] 🔌 WebSocket aceito para interview ID: {id}")

    transcript_data = {"utterances": []}

    date = datetime.now().isoformat()
    audio_filename = f"interview_{id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    audio_path = os.path.join(upload_dir, audio_filename)

    audio_file = await aiofiles.open(audio_path, 'wb')

    config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )
    
    # Substituir StreamingClient por conexão WebSocket direta do AssemblyAI
    streaming_client = None
    try:
        # Conectar ao AssemblyAI Universal Streaming API (v3)
        # v2 foi depreciada - usar v3 com modelo universal-streaming
        assemblyai_url = (
            f"wss://streaming.assemblyai.com/v3/ws"
            f"?sample_rate=16000"
            f"&encoding=pcm_s16le"
            f"&speech_model=universal-streaming-multilingual"
        )
        # A biblioteca websockets usa additional_headers ao invés de extra_headers
        streaming_client = await websockets.connect(
            assemblyai_url, 
            additional_headers={"Authorization": ASSEMBLYAI_API_KEY}
        )
        print("[DEBUG] ✅ Conectado ao AssemblyAI Universal Streaming v3")
    except Exception as e:
        print(f"[WARNING] Could not connect to AssemblyAI Realtime: {e}")
        # Fechar conexão se foi criada mas falhou
        if streaming_client:
            try:
                await streaming_client.close()
            except:
                pass
        streaming_client = None

    try:
        stop_event = asyncio.Event()

        async def send_audio():
            chunk_count = 0
            while True:
                try:
                    audio_chunk = await websocket.receive_bytes()
                    chunk_count += 1
                    if chunk_count % 100 == 0:  # Log a cada 100 chunks
                        print(f"[DEBUG] 📥 Recebido {len(audio_chunk)} bytes do frontend (chunk #{chunk_count})")
                    await audio_file.write(audio_chunk)
                    if streaming_client:
                        # Enviar áudio binário para AssemblyAI v3
                        await streaming_client.send(audio_chunk)
                except WebSocketDisconnect:
                    print("[DEBUG] WebSocket desconectado em send_audio")
                    stop_event.set()
                    break
                except Exception as e:
                    print(f"[ERROR] Erro em send_audio: {e}")
                    break

        async def receive_transcripts():
            if not streaming_client:
                print("[WARNING] streaming_client é None, não receberá transcrições - aguardando...")
                # Aguardar indefinidamente para não quebrar o asyncio.gather
                while not stop_event.is_set():
                    await asyncio.sleep(1)
                return
            print("[DEBUG] 🎧 Iniciando receive_transcripts - aguardando mensagens do AssemblyAI...")
            # Rastrear último turn ativo por speaker para agrupar atualizações
            last_active_turn = {}  # {speaker: turn_id}
            turn_counter = {}  # {speaker: counter} para gerar IDs únicos
            finalize_timers = {}  # {speaker: asyncio.Task} para timers de finalização
            last_text = {}  # {turn_id: texto_anterior} para calcular diff
            
            async def finalize_turn(speaker, turn_id, delay=4.0):
                """Finaliza um turn após X segundos de silêncio"""
                try:
                    await asyncio.sleep(delay)
                    
                    # Verificar se o WebSocket ainda está aberto antes de enviar
                    if stop_event.is_set():
                        print(f"[DEBUG] WebSocket fechado, cancelando finalização do turn {turn_id}")
                        return
                    
                    # Após 4 segundos, marcar como final e salvar no transcript_data
                    print(f"[DEBUG] Finalizando turn {turn_id} do speaker {speaker} após {delay}s de silêncio")
                    
                    # Salvar no transcript_data
                    if turn_id in last_text:
                        final_text = last_text[turn_id]
                        transcript_data["utterances"].append({
                            "speaker": speaker,
                            "text": final_text,
                            "start": 0,  # Será atualizado se necessário
                            "end": 0
                        })
                    
                    # Enviar mensagem de finalização apenas se WebSocket ainda estiver aberto
                    try:
                        # Verificar se o WebSocket ainda está conectado
                        if not stop_event.is_set():
                            await websocket.send_json({
                                "transcript_finalize": {
                                    "id": turn_id,
                                    "speaker": speaker
                                }
                            })
                    except Exception as e:
                        print(f"[DEBUG] WebSocket já fechado ao tentar finalizar turn {turn_id}: {e}")
                    
                    # Limpar do active turns para forçar criação de novo ID na próxima frase
                    if speaker in last_active_turn:
                        del last_active_turn[speaker]
                    if turn_id in last_text:
                        del last_text[turn_id]
                except asyncio.CancelledError:
                    # Timer foi cancelado (nova palavra chegou antes de 4s)
                    print(f"[DEBUG] Timer cancelado para turn {turn_id} - pessoa voltou a falar")
                    pass
                except Exception as e:
                    print(f"[ERROR] Erro em finalize_turn para turn {turn_id}: {e}")
            
            message_count = 0
            try:
                async for message in streaming_client:
                    try:
                        message_count += 1
                        data = json.loads(message)
                        msg_type = data.get("message_type") or data.get("type")
                        
                        # Log todas as mensagens recebidas (primeiras 10)
                        if message_count <= 10:
                            print(f"[DEBUG] 📨 Mensagem #{message_count} recebida - Tipo: {msg_type}, Keys: {list(data.keys())}")
                        
                        # Processar mensagens do Universal Streaming API v3
                        if msg_type == "SessionOpened" or msg_type == "Begin":
                            # Sessão iniciada
                            print(f"[DEBUG] ✅ Sessão AssemblyAI iniciada: {data.get('session_id') or data.get('id')}")
                        elif msg_type == "PartialTranscript" or msg_type == "Turn":
                            # Transcrição parcial - v3 envia palavra por palavra
                            # Tentar diferentes campos para o texto
                            text = data.get("text", "") or data.get("transcript", "") or data.get("words", "")
                            if isinstance(text, list):
                                # Se for lista de palavras, juntar
                                text = " ".join([w.get("text", "") if isinstance(w, dict) else str(w) for w in text])
                            text = str(text).strip()
                            
                            if text:
                                # Debug: log da mensagem completa recebida
                                print(f"[DEBUG] {msg_type} recebido - Text: '{text[:50]}...'")
                                
                                # Tentar obter speaker de diferentes campos
                                speaker = data.get("speaker") or data.get("speaker_label") or data.get("speaker_id") or "A"
                                if isinstance(speaker, (int, float)):
                                    speaker = "A" if speaker == 0 else "B"
                                elif isinstance(speaker, str):
                                    speaker = speaker.upper()
                                else:
                                    speaker = "A"
                                
                                # Timestamps (v3 usa created timestamp)
                                start = 0
                                end = 0
                                
                                # Verificar se é continuação da frase anterior ou nova frase
                                is_new_turn = False
                                turn_id = None
                                if speaker in last_active_turn:
                                    turn_id = last_active_turn[speaker]
                                    previous_text = last_text.get(turn_id, "")
                                    
                                    # Se o novo texto não começa com o anterior, é uma nova frase
                                    if previous_text and not text.startswith(previous_text):
                                        print(f"[DEBUG] Novo texto não continua o anterior - criando nova frase")
                                        is_new_turn = True
                                else:
                                    is_new_turn = True
                                
                                # Se é nova frase, criar novo turn_id
                                if is_new_turn:
                                    # Salvar frase anterior (se existir)
                                    if speaker in last_active_turn:
                                        old_turn_id = last_active_turn[speaker]
                                        if old_turn_id in last_text:
                                            final_text = last_text[old_turn_id]
                                            transcript_data["utterances"].append({
                                                "speaker": speaker,
                                                "text": final_text,
                                                "start": 0,
                                                "end": 0
                                            })
                                            # Enviar finalização da frase anterior
                                            try:
                                                if not stop_event.is_set():
                                                    await websocket.send_json({
                                                        "transcript_finalize": {
                                                            "id": old_turn_id,
                                                            "speaker": speaker
                                                        }
                                                    })
                                            except Exception as e:
                                                print(f"[DEBUG] WebSocket fechado ao enviar finalização: {e}")
                                            del last_text[old_turn_id]
                                    
                                    # Criar nova frase
                                    if speaker not in turn_counter:
                                        turn_counter[speaker] = 0
                                    turn_counter[speaker] += 1
                                    turn_id = f"{speaker}_{turn_counter[speaker]}"
                                    last_active_turn[speaker] = turn_id
                                    last_text[turn_id] = ""
                                    print(f"[DEBUG] Criando nova frase: {turn_id}")
                                
                                # Cancelar timer anterior deste speaker (se existir)
                                if speaker in finalize_timers:
                                    finalize_timers[speaker].cancel()
                                
                                # Criar novo timer de 4 segundos para finalizar
                                finalize_timers[speaker] = asyncio.create_task(
                                    finalize_turn(speaker, turn_id, delay=4.0)
                                )
                                
                                # Calcular apenas as palavras novas (diff)
                                previous_text = last_text.get(turn_id, "")
                                new_words = text[len(previous_text):] if text.startswith(previous_text) else text
                                last_text[turn_id] = text
                                
                                # Debug: log do speaker recebido
                                print(f"[DEBUG] Turn parcial - Speaker: {speaker}, ID: {turn_id}, New words: '{new_words}'")
                                
                                utt_dict = {
                                    "id": turn_id,
                                    "speaker": speaker,
                                    "text": text,  # Texto completo (para referência)
                                    "new_words": new_words,  # Apenas palavras novas
                                    "start": start,
                                    "end": end,
                                    "is_final": False
                                }
                                
                                # Enviar atualização parcial para o frontend
                                print(f"[DEBUG] 📤 Enviando para frontend: '{new_words[:30]}...'")
                                try:
                                    if not stop_event.is_set():
                                        await websocket.send_json({"transcript_update": [utt_dict]})
                                    else:
                                        print(f"[DEBUG] WebSocket fechado, não enviando transcript_update")
                                except Exception as e:
                                    print(f"[DEBUG] WebSocket fechado ao enviar transcript_update: {e}")
                        elif msg_type == "FinalTranscript" or msg_type == "Termination":
                            # Transcrição final - v3 envia quando completa uma frase
                            text = data.get("text", "") or data.get("transcript", "")
                            if isinstance(text, list):
                                text = " ".join([w.get("text", "") if isinstance(w, dict) else str(w) for w in text])
                            text = str(text).strip()
                            if text:
                                print(f"[DEBUG] ✅ Transcrição FINAL recebida: {text[:50]}...")
                        elif msg_type == "SessionClosed" or msg_type == "Error":
                            # Sessão terminada ou erro
                            print(f"[DEBUG] Session closed/error: {data.get('audio_duration_seconds') or data.get('error')}")
                        else:
                            # Log mensagens desconhecidas
                            if message_count <= 20:
                                print(f"[DEBUG] ⚠️ Mensagem desconhecida: {msg_type} - {list(data.keys())}")
                    except json.JSONDecodeError as e:
                        print(f"[ERROR] Erro ao fazer parse JSON: {e}, Mensagem: {message[:100] if len(message) > 100 else message}")
                        continue
                    except Exception as e:
                        print(f"[ERROR] Error processing transcription: {e}")
                        import traceback
                        traceback.print_exc()
                        continue
            except Exception as e:
                print(f"[ERROR] Erro no loop de recebimento de transcrições: {e}")
                import traceback
                traceback.print_exc()

        async def periodic_gpt_analysis():
            while not stop_event.is_set():
                await asyncio.sleep(40)
                last_utts = get_utterances_last_n_seconds(transcript_data, 50)
                if not last_utts:
                    continue
                prompt_to_send = append_transcript_to_prompt(original_prompt_template, last_utts)
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "user", "content": prompt_to_send},
                    ],
                    response_format={ "type": "json_object" },
                    max_tokens=200,
                    temperature=0.5
                )
                gpt_message = response.choices[0].message.content.strip()
                await websocket.send_json({"gpt_response": gpt_message})

        await asyncio.gather(
            send_audio(),
            receive_transcripts(),
            periodic_gpt_analysis()
        )

    except WebSocketDisconnect:
        stop_event.set()
        print(f"\n{'='*80}")
        print(f"[WEBSOCKET] 🔌 WebSocket desconectado para interview {id}")
        print(f"[WEBSOCKET] ❌ NÃO salvando transcrição em tempo real no banco")
        print(f"[WEBSOCKET] 📝 Motivo: O áudio será transcrito COM DIARIZAÇÃO em background")
        print(f"[WEBSOCKET] 💡 A transcrição em tempo real foi usada apenas para exibição durante a gravação")
        print(f"{'='*80}\n")
        # ❌ NÃO SALVAR: await save_transcript_to_db(id, transcript_data)
        # A transcrição em tempo real NÃO deve ser salva porque:
        # 1. Não tem diarização adequada
        # 2. O áudio será processado COM diarização pelo background task
        # 3. Salvar aqui causa race condition e sobrescreve a transcrição boa
        
        if streaming_client:
            try:
                # Enviar mensagem de Terminate antes de fechar
                await streaming_client.send(json.dumps({"type": "Terminate"}))
            except:
                pass
            try:
                await streaming_client.close()
            except:
                pass
    except Exception as e:
        stop_event.set()
        print(f"\n[WEBSOCKET] ❌ WebSocket error para interview {id}: {e}")
        print(f"[WEBSOCKET] ❌ NÃO salvando transcrição em tempo real")
        if streaming_client:
            try:
                # Enviar mensagem de Terminate antes de fechar
                await streaming_client.send(json.dumps({"type": "Terminate"}))
            except:
                pass
            try:
                await streaming_client.close()
            except:
                pass
    finally:
        # Garantir que a conexão seja fechada no finally também
        if streaming_client:
            try:
                await streaming_client.close()
            except:
                pass
        await audio_file.close()
        
        print(f"\n{'='*80}")
        print(f"[WEBSOCKET] 🧹 Limpeza final do WebSocket para interview {id}")
        print(f"{'='*80}")
        
        # Converter PCM para WAV para compatibilidade com player de áudio
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            wav_path = audio_path.replace('.wav', '_final.wav')
            if convert_pcm_to_wav(audio_path, wav_path):
                # Substituir arquivo PCM por WAV
                try:
                    os.replace(wav_path, audio_path)
                    print(f"[WEBSOCKET] ✅ Áudio convertido PCM → WAV: {audio_path}")
                except Exception as e:
                    print(f"[WEBSOCKET] ⚠️ Error replacing PCM with WAV: {e}")
        
        # ❌ REMOVIDO: Não salvar transcrição em tempo real
        # A transcrição será feita APENAS pelo background task COM diarização
        # Salvar aqui causa race condition e sobrescreve a transcrição com diarização
        
        print(f"[WEBSOCKET] ❌ NÃO salvando transcrição em tempo real ({len(transcript_data['utterances'])} utterances)")
        print(f"[WEBSOCKET] 📝 Aguardando transcrição COM DIARIZAÇÃO do background task")
        print(f"{'='*80}\n")
        
        # Atualizar apenas o audio_file no banco (se ainda não foi atualizado pelo upload)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar se audio_file já foi setado pelo endpoint de upload
        cursor.execute("SELECT audio_file FROM interviews WHERE id = ?", (id,))
        row = cursor.fetchone()
        
        if not row or not row["audio_file"]:
            # Só atualizar se ainda não foi setado pelo upload
            cursor.execute(
                "UPDATE interviews SET audio_file = ?, date = ? WHERE id = ?", 
                (audio_path, date, id)
            )
            conn.commit()
            print(f"[WEBSOCKET] 💾 Audio file path salvo no banco: {audio_path}")
        else:
            print(f"[WEBSOCKET] ℹ️  Audio file já foi salvo pelo endpoint de upload")
        
        conn.close()
