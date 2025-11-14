#!/usr/bin/env python3
"""
Script para verificar arquivos de áudio e diagnosticar problemas de duração/metadata.

Uso:
    python check_audio_files.py --all         # Verificar todos os arquivos
    python check_audio_files.py --id 5        # Verificar apenas entrevista ID 5
"""

import sqlite3
import os
import sys
import argparse
import struct

DATABASE = "./interviews.db"

def check_wav_file(filepath):
    """Verifica se um arquivo WAV tem estrutura válida"""
    try:
        with open(filepath, 'rb') as f:
            # Ler header RIFF
            riff = f.read(4)
            if riff != b'RIFF':
                return False, "Não é um arquivo RIFF válido"
            
            file_size = struct.unpack('<I', f.read(4))[0]
            wave = f.read(4)
            if wave != b'WAVE':
                return False, "Não é um arquivo WAVE válido"
            
            # Procurar chunk fmt
            while True:
                chunk_id = f.read(4)
                if not chunk_id:
                    return False, "Chunk fmt não encontrado"
                chunk_size = struct.unpack('<I', f.read(4))[0]
                
                if chunk_id == b'fmt ':
                    # Ler dados do fmt
                    audio_format = struct.unpack('<H', f.read(2))[0]
                    channels = struct.unpack('<H', f.read(2))[0]
                    sample_rate = struct.unpack('<I', f.read(4))[0]
                    byte_rate = struct.unpack('<I', f.read(4))[0]
                    block_align = struct.unpack('<H', f.read(2))[0]
                    bits_per_sample = struct.unpack('<H', f.read(2))[0]
                    
                    # Pular resto do chunk
                    f.seek(chunk_size - 16, 1)
                    break
                else:
                    # Pular chunk
                    f.seek(chunk_size, 1)
            
            # Procurar chunk data
            while True:
                chunk_id = f.read(4)
                if not chunk_id:
                    return False, "Chunk data não encontrado"
                chunk_size = struct.unpack('<I', f.read(4))[0]
                
                if chunk_id == b'data':
                    # Calcular duração
                    duration = chunk_size / (sample_rate * channels * (bits_per_sample // 8))
                    
                    return True, {
                        'format': 'PCM' if audio_format == 1 else f'Format {audio_format}',
                        'channels': channels,
                        'sample_rate': sample_rate,
                        'bits_per_sample': bits_per_sample,
                        'data_size': chunk_size,
                        'duration': duration
                    }
                else:
                    # Pular chunk
                    f.seek(chunk_size, 1)
                    
    except Exception as e:
        return False, f"Erro ao ler arquivo: {e}"

def check_webm_file(filepath):
    """Verifica informações básicas de um arquivo WebM"""
    try:
        file_size = os.path.getsize(filepath)
        
        with open(filepath, 'rb') as f:
            # Ler primeiros bytes
            header = f.read(4)
            
            # WebM/Matroska começa com EBML header (0x1A 0x45 0xDF 0xA3)
            if header[0:4] == b'\x1a\x45\xdf\xa3':
                return True, {
                    'format': 'WebM/Matroska',
                    'file_size': file_size,
                    'note': 'Arquivo WebM detectado - duração requer parser completo'
                }
            else:
                return False, "Não é um arquivo WebM válido (header incorreto)"
                
    except Exception as e:
        return False, f"Erro ao ler arquivo: {e}"

def check_audio_file(filepath):
    """Verifica um arquivo de áudio e retorna informações"""
    if not os.path.exists(filepath):
        return False, "Arquivo não existe"
    
    file_size = os.path.getsize(filepath)
    if file_size == 0:
        return False, "Arquivo vazio (0 bytes)"
    
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.wav':
        return check_wav_file(filepath)
    elif ext == '.webm':
        return check_webm_file(filepath)
    else:
        return False, f"Formato desconhecido: {ext}"

def check_all_interviews():
    """Verifica áudios de todas as entrevistas"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, audio_file, date
        FROM interviews
        WHERE audio_file IS NOT NULL AND audio_file != ''
        ORDER BY id
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        print("❌ Nenhuma entrevista com áudio encontrada")
        return
    
    print(f"\n{'='*80}")
    print(f"VERIFICAÇÃO DE ARQUIVOS DE ÁUDIO - Total: {len(rows)} entrevistas")
    print(f"{'='*80}\n")
    
    good = []
    bad = []
    
    for row in rows:
        interview_id = row["id"]
        name = row["name"] or "Sem nome"
        audio_file = row["audio_file"]
        
        # Converter para caminho absoluto se necessário
        if not os.path.isabs(audio_file):
            audio_file = os.path.join(os.getcwd(), audio_file)
        
        print(f"\n{'─'*80}")
        print(f"📋 ID {interview_id:3d} - {name}")
        print(f"📁 {audio_file}")
        
        is_valid, info = check_audio_file(audio_file)
        
        if is_valid:
            print(f"✅ Arquivo válido")
            if isinstance(info, dict):
                for key, value in info.items():
                    if key == 'duration':
                        mins = int(value // 60)
                        secs = int(value % 60)
                        print(f"   ⏱️  {key}: {mins}m {secs}s ({value:.2f}s)")
                    elif key == 'data_size' or key == 'file_size':
                        mb = value / 1024 / 1024
                        print(f"   📦 {key}: {mb:.2f} MB ({value} bytes)")
                    else:
                        print(f"   ℹ️  {key}: {value}")
            good.append(interview_id)
        else:
            print(f"❌ Problema: {info}")
            bad.append(interview_id)
    
    print(f"\n{'='*80}")
    print(f"RESUMO:")
    print(f"✅ Arquivos válidos: {len(good)}")
    print(f"❌ Arquivos com problemas: {len(bad)}")
    if bad:
        print(f"\nIDs com problemas: {bad}")
    print(f"{'='*80}\n")

def check_single_interview(interview_id):
    """Verifica áudio de uma entrevista específica"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, audio_file, date
        FROM interviews
        WHERE id = ?
    """, (interview_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        print(f"❌ Entrevista ID {interview_id} não encontrada")
        return
    
    if not row["audio_file"]:
        print(f"❌ Entrevista ID {interview_id} não tem arquivo de áudio")
        return
    
    audio_file = row["audio_file"]
    if not os.path.isabs(audio_file):
        audio_file = os.path.join(os.getcwd(), audio_file)
    
    print(f"\n{'='*80}")
    print(f"VERIFICANDO ENTREVISTA ID: {interview_id}")
    print(f"{'='*80}")
    print(f"📋 Candidato: {row['name'] or 'Sem nome'}")
    print(f"📁 Arquivo: {audio_file}")
    print(f"📅 Data: {row['date']}")
    
    is_valid, info = check_audio_file(audio_file)
    
    print(f"\n{'─'*80}")
    if is_valid:
        print(f"✅ ARQUIVO VÁLIDO")
        if isinstance(info, dict):
            print(f"\nDetalhes:")
            for key, value in info.items():
                if key == 'duration':
                    mins = int(value // 60)
                    secs = int(value % 60)
                    print(f"  ⏱️  Duração: {mins}m {secs}s ({value:.2f}s)")
                elif key == 'data_size' or key == 'file_size':
                    mb = value / 1024 / 1024
                    print(f"  📦 Tamanho: {mb:.2f} MB ({value} bytes)")
                else:
                    print(f"  ℹ️  {key}: {value}")
    else:
        print(f"❌ PROBLEMA DETECTADO")
        print(f"  Erro: {info}")
    
    print(f"{'='*80}\n")

def main():
    parser = argparse.ArgumentParser(description="Verifica arquivos de áudio das entrevistas")
    parser.add_argument("--all", action="store_true", help="Verificar todas as entrevistas")
    parser.add_argument("--id", type=int, help="ID da entrevista a verificar")
    
    args = parser.parse_args()
    
    if args.id:
        check_single_interview(args.id)
    elif args.all:
        check_all_interviews()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

