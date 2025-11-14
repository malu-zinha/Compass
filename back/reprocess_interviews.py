#!/usr/bin/env python3
"""
Script para reprocessar entrevistas antigas com transcrição COM DIARIZAÇÃO.

Uso:
    python reprocess_interviews.py --id 5              # Reprocessar apenas a entrevista ID 5
    python reprocess_interviews.py --all              # Reprocessar todas com áudio
    python reprocess_interviews.py --without-diarization  # Reprocessar apenas as sem diarização
"""

import sqlite3
import json
import os
import sys
import argparse
import assemblyai as aai
from dotenv import load_dotenv
import time

# Carregar variáveis de ambiente
load_dotenv()
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

DATABASE = "./interviews.db"

def check_diarization(transcript_json):
    """Verifica se uma transcrição tem diarização adequada"""
    if not transcript_json:
        return False
    
    try:
        transcript_data = json.loads(transcript_json)
        utterances = transcript_data.get("utterances", []) if isinstance(transcript_data, dict) else transcript_data
        
        if not utterances or len(utterances) == 0:
            return False
        
        speakers = set([utt.get("speaker", "").upper() for utt in utterances if utt.get("speaker")])
        return 'A' in speakers and 'B' in speakers
    except:
        return False

def reprocess_interview(interview_id):
    """Reprocessa uma entrevista específica com diarização"""
    print(f"\n{'='*80}")
    print(f"🎙️  REPROCESSANDO ENTREVISTA ID: {interview_id}")
    print(f"{'='*80}")
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Buscar entrevista
    cursor.execute("SELECT id, name, audio_file, transcript FROM interviews WHERE id = ?", (interview_id,))
    row = cursor.fetchone()
    
    if not row:
        print(f"❌ Entrevista {interview_id} não encontrada no banco")
        conn.close()
        return False
    
    audio_file = row["audio_file"]
    name = row["name"] or "Sem nome"
    
    print(f"📋 Candidato: {name}")
    print(f"📁 Áudio: {audio_file}")
    
    if not audio_file:
        print(f"❌ Entrevista não tem arquivo de áudio")
        conn.close()
        return False
    
    if not os.path.exists(audio_file):
        print(f"❌ Arquivo de áudio não encontrado: {audio_file}")
        conn.close()
        return False
    
    # Verificar tamanho do arquivo
    file_size_mb = os.path.getsize(audio_file) / 1024 / 1024
    print(f"📦 Tamanho: {file_size_mb:.2f} MB")
    
    # Verificar se já tem diarização
    has_diarization = check_diarization(row["transcript"])
    if has_diarization:
        print(f"✅ Entrevista JÁ tem diarização adequada - pulando")
        conn.close()
        return True
    
    print(f"⚠️  Entrevista SEM diarização adequada - reprocessando...")
    print(f"📤 Enviando para AssemblyAI...")
    
    try:
        # Configurar transcrição com diarização
        config = aai.TranscriptionConfig(
            language_code="pt",
            speaker_labels=True,
            speakers_expected=2,
        )
        
        start_time = time.time()
        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(audio_file)
        transcription_time = time.time() - start_time
        
        print(f"⏱️  Transcrição levou {transcription_time:.2f}s")
        print(f"📊 Status: {transcript.status}")
        
        if transcript.status == "error":
            print(f"❌ Erro na transcrição: {transcript.error}")
            conn.close()
            return False
        
        if transcript.status == "completed" and transcript.utterances:
            utt_list = []
            speakers_found = set()
            
            for utt in transcript.utterances:
                # Converter speaker para formato consistente (A, B, C...)
                speaker = utt.speaker
                if isinstance(speaker, (int, float)):
                    speaker = chr(65 + int(speaker))  # 0 -> A, 1 -> B
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
            
            # Salvar no banco
            transcript_data = {"utterances": utt_list}
            transcript_json = json.dumps(transcript_data)
            
            cursor.execute(
                "UPDATE interviews SET transcript = ? WHERE id = ?",
                (transcript_json, interview_id)
            )
            conn.commit()
            conn.close()
            
            print(f"\n✅ SUCESSO!")
            print(f"   - Total de utterances: {len(utt_list)}")
            print(f"   - Speakers identificados: {sorted(speakers_found)}")
            print(f"   - Tem diarização: {'✅ SIM' if ('A' in speakers_found and 'B' in speakers_found) else '❌ NÃO'}")
            return True
        else:
            print(f"❌ Transcrição não completada ou sem utterances")
            print(f"   Status: {transcript.status}")
            conn.close()
            return False
            
    except Exception as e:
        print(f"❌ Erro ao transcrever: {e}")
        import traceback
        traceback.print_exc()
        conn.close()
        return False

def find_interviews_to_process(mode="all"):
    """Encontra entrevistas que precisam ser reprocessadas"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if mode == "without-diarization":
        # Buscar apenas entrevistas com áudio mas sem diarização adequada
        cursor.execute("""
            SELECT id, name, audio_file, transcript
            FROM interviews
            WHERE audio_file IS NOT NULL AND audio_file != ''
            ORDER BY id
        """)
    else:
        # Buscar todas com áudio
        cursor.execute("""
            SELECT id, name, audio_file, transcript
            FROM interviews
            WHERE audio_file IS NOT NULL AND audio_file != ''
            ORDER BY id
        """)
    
    rows = cursor.fetchall()
    conn.close()
    
    # Filtrar se necessário
    if mode == "without-diarization":
        to_process = []
        for row in rows:
            if not check_diarization(row["transcript"]):
                to_process.append(row)
        return to_process
    else:
        return rows

def main():
    parser = argparse.ArgumentParser(description="Reprocessa entrevistas com diarização")
    parser.add_argument("--id", type=int, help="ID da entrevista a reprocessar")
    parser.add_argument("--all", action="store_true", help="Reprocessar todas com áudio")
    parser.add_argument("--without-diarization", action="store_true", help="Reprocessar apenas as sem diarização")
    
    args = parser.parse_args()
    
    if not os.getenv("ASSEMBLYAI_API_KEY"):
        print("❌ ASSEMBLYAI_API_KEY não encontrada no .env")
        return
    
    if args.id:
        # Reprocessar uma entrevista específica
        success = reprocess_interview(args.id)
        sys.exit(0 if success else 1)
        
    elif args.all or args.without_diarization:
        # Reprocessar múltiplas entrevistas
        mode = "without-diarization" if args.without_diarization else "all"
        interviews = find_interviews_to_process(mode)
        
        if not interviews:
            print("✅ Nenhuma entrevista para reprocessar!")
            return
        
        print(f"\n{'='*80}")
        print(f"Encontradas {len(interviews)} entrevistas para reprocessar")
        print(f"{'='*80}\n")
        
        for row in interviews:
            print(f"ID {row['id']:3d} - {row['name'] or 'Sem nome':30s}")
        
        print(f"\n⚠️  Isso usará créditos da API do AssemblyAI!")
        print(f"⚠️  Estimativa: ~{len(interviews)} transcrições")
        response = input(f"\nDigite 'SIM' para continuar: ")
        
        if response != "SIM":
            print("❌ Cancelado pelo usuário")
            return
        
        success_count = 0
        fail_count = 0
        
        for i, row in enumerate(interviews, 1):
            print(f"\n\n{'#'*80}")
            print(f"PROCESSANDO {i}/{len(interviews)}")
            print(f"{'#'*80}")
            
            if reprocess_interview(row["id"]):
                success_count += 1
            else:
                fail_count += 1
            
            # Aguardar um pouco entre cada transcrição para não sobrecarregar a API
            if i < len(interviews):
                print(f"\n⏳ Aguardando 2 segundos antes da próxima...")
                time.sleep(2)
        
        print(f"\n\n{'='*80}")
        print(f"RESUMO FINAL")
        print(f"{'='*80}")
        print(f"✅ Sucesso: {success_count}")
        print(f"❌ Falhas: {fail_count}")
        print(f"📊 Total: {len(interviews)}")
        print(f"{'='*80}\n")
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

