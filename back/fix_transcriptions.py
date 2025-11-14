#!/usr/bin/env python3
"""
Script para limpar transcrições sem diarização adequada do banco de dados.
Mantém apenas transcrições que têm speakers A e B identificados.

Uso:
    python fix_transcriptions.py --clear-all    # Limpa TODAS as transcrições sem diarização
    python fix_transcriptions.py --check        # Apenas verifica o status
"""

import sqlite3
import json
import sys
import argparse

DATABASE = "./interviews.db"

def check_diarization(transcript_json):
    """Verifica se uma transcrição tem diarização adequada (speakers A/B)"""
    if not transcript_json:
        return False, "Transcrição vazia"
    
    try:
        transcript_data = json.loads(transcript_json)
        
        # Extrair utterances
        if isinstance(transcript_data, dict) and "utterances" in transcript_data:
            utterances = transcript_data["utterances"]
        elif isinstance(transcript_data, list):
            utterances = transcript_data
        else:
            return False, "Formato inválido"
        
        if not utterances or len(utterances) == 0:
            return False, "Sem utterances"
        
        # Verificar speakers
        speakers = set()
        for utt in utterances:
            speaker = utt.get("speaker", "")
            if speaker:
                speakers.add(str(speaker).upper())
        
        # Verificar se tem A e B
        has_ab = 'A' in speakers and 'B' in speakers
        
        if has_ab:
            return True, f"OK - Speakers: {sorted(speakers)}"
        else:
            return False, f"Sem diarização - Speakers: {sorted(speakers) if speakers else 'Nenhum'}"
            
    except json.JSONDecodeError:
        return False, "JSON inválido"
    except Exception as e:
        return False, f"Erro: {str(e)}"

def check_all_interviews():
    """Verifica todas as entrevistas e mostra o status"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, date, audio_file, transcript
        FROM interviews
        ORDER BY id
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    print(f"\n{'='*80}")
    print(f"VERIFICAÇÃO DE TRANSCRIÇÕES - Total: {len(rows)} entrevistas")
    print(f"{'='*80}\n")
    
    good = []
    bad = []
    
    for row in rows:
        interview_id = row["id"]
        name = row["name"] or "Sem nome"
        has_audio = bool(row["audio_file"])
        transcript = row["transcript"]
        
        has_diarization, reason = check_diarization(transcript)
        
        status_icon = "✅" if has_diarization else "❌"
        audio_icon = "🎵" if has_audio else "  "
        
        print(f"{status_icon} {audio_icon} ID {interview_id:3d} - {name:30s} - {reason}")
        
        if has_diarization:
            good.append(interview_id)
        else:
            bad.append(interview_id)
    
    print(f"\n{'='*80}")
    print(f"✅ Com diarização adequada: {len(good)}")
    print(f"❌ Sem diarização adequada: {len(bad)}")
    if bad:
        print(f"\nIDs sem diarização: {bad}")
    print(f"{'='*80}\n")
    
    return bad

def clear_bad_transcriptions(dry_run=True):
    """Limpa transcrições sem diarização adequada"""
    bad_ids = check_all_interviews()
    
    if not bad_ids:
        print("✅ Nenhuma transcrição para limpar!")
        return
    
    if dry_run:
        print(f"\n⚠️  MODO DRY-RUN (nada será modificado)")
        print(f"As seguintes {len(bad_ids)} transcrições SERIAM limpas:")
        print(f"IDs: {bad_ids}")
        print(f"\nPara executar a limpeza real, use: python fix_transcriptions.py --clear-all --confirm")
        return
    
    # Confirmar
    print(f"\n⚠️  ATENÇÃO: Você está prestes a limpar {len(bad_ids)} transcrições!")
    print(f"IDs: {bad_ids}")
    response = input(f"\nDigite 'CONFIRMAR' para prosseguir: ")
    
    if response != "CONFIRMAR":
        print("❌ Cancelado pelo usuário")
        return
    
    # Executar limpeza
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    for interview_id in bad_ids:
        cursor.execute(
            "UPDATE interviews SET transcript = '' WHERE id = ?",
            (interview_id,)
        )
        print(f"🧹 Limpou transcrição do ID {interview_id}")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ {len(bad_ids)} transcrições foram limpas!")
    print(f"💡 Agora o backend pode reprocessar esses áudios com diarização adequada")

def main():
    parser = argparse.ArgumentParser(description="Verifica e limpa transcrições sem diarização")
    parser.add_argument("--check", action="store_true", help="Apenas verificar status (padrão)")
    parser.add_argument("--clear-all", action="store_true", help="Limpar transcrições sem diarização")
    parser.add_argument("--confirm", action="store_true", help="Confirmar limpeza (necessário com --clear-all)")
    
    args = parser.parse_args()
    
    if args.clear_all:
        if args.confirm:
            clear_bad_transcriptions(dry_run=False)
        else:
            clear_bad_transcriptions(dry_run=True)
    else:
        # Modo padrão: apenas verificar
        check_all_interviews()

if __name__ == "__main__":
    main()

