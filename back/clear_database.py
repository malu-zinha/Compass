#!/usr/bin/env python3
"""
Script para limpar TODOS os dados do banco de dados.
ATENÇÃO: Esta ação é IRREVERSÍVEL!

Uso:
    python clear_database.py --confirm
"""

import sqlite3
import os
import sys
import argparse
import shutil

DATABASE = "./interviews.db"
UPLOADS_DIR = "./uploads"

def backup_database():
    """Cria backup do banco antes de limpar"""
    if os.path.exists(DATABASE):
        from datetime import datetime
        backup_name = f"interviews_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(DATABASE, backup_name)
        print(f"✅ Backup criado: {backup_name}")
        return backup_name
    return None

def clear_all_data(skip_backup=False):
    """Limpa TODOS os dados do banco de dados"""
    
    if not os.path.exists(DATABASE):
        print("❌ Banco de dados não encontrado!")
        return
    
    # Criar backup
    if not skip_backup:
        backup_file = backup_database()
        print(f"💾 Backup salvo em: {backup_file}")
    
    print(f"\n{'='*80}")
    print("🗑️  LIMPANDO BANCO DE DADOS")
    print(f"{'='*80}\n")
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Contar registros antes
    cursor.execute("SELECT COUNT(*) FROM interviews")
    interviews_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM positions")
    positions_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM global_questions")
    questions_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM questions")
    interview_questions_count = cursor.fetchone()[0]
    
    print(f"📊 Dados atuais:")
    print(f"   - Entrevistas: {interviews_count}")
    print(f"   - Cargos: {positions_count}")
    print(f"   - Perguntas globais: {questions_count}")
    print(f"   - Perguntas de entrevistas: {interview_questions_count}")
    
    if interviews_count == 0 and positions_count == 0 and questions_count == 0:
        print("\n✅ Banco de dados já está vazio!")
        conn.close()
        return
    
    # Deletar todos os dados
    print(f"\n{'─'*80}")
    print("🧹 Limpando tabelas...")
    
    # Ordem importante por causa de foreign keys
    cursor.execute("DELETE FROM questions")
    print("   ✅ Perguntas de entrevistas deletadas")
    
    cursor.execute("DELETE FROM interviews")
    print("   ✅ Entrevistas deletadas")
    
    cursor.execute("DELETE FROM global_questions")
    print("   ✅ Perguntas globais deletadas")
    
    cursor.execute("DELETE FROM positions")
    print("   ✅ Cargos deletados")
    
    # Resetar auto-increment counters
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('interviews', 'positions', 'global_questions', 'questions')")
    print("   ✅ Contadores resetados")
    
    conn.commit()
    conn.close()
    
    # Limpar arquivos de áudio
    if os.path.exists(UPLOADS_DIR):
        try:
            audio_files = [f for f in os.listdir(UPLOADS_DIR) if f.startswith('interview_')]
            if audio_files:
                print(f"\n🗑️  Limpando arquivos de áudio ({len(audio_files)} arquivos)...")
                for filename in audio_files:
                    filepath = os.path.join(UPLOADS_DIR, filename)
                    try:
                        os.remove(filepath)
                    except Exception as e:
                        print(f"   ⚠️  Erro ao deletar {filename}: {e}")
                print(f"   ✅ {len(audio_files)} arquivos de áudio deletados")
        except Exception as e:
            print(f"   ⚠️  Erro ao limpar uploads: {e}")
    
    print(f"\n{'='*80}")
    print("✅ BANCO DE DADOS LIMPO COM SUCESSO!")
    print(f"{'='*80}")
    print(f"\n💡 Estatísticas:")
    print(f"   - {interviews_count} entrevistas removidas")
    print(f"   - {positions_count} cargos removidos")
    print(f"   - {questions_count} perguntas globais removidas")
    print(f"   - {interview_questions_count} perguntas de entrevistas removidas")
    
    if not skip_backup and backup_file:
        print(f"\n📦 Backup disponível em: {backup_file}")
        print(f"   Para restaurar: mv {backup_file} {DATABASE}")
    
    print()

def show_current_data():
    """Mostra dados atuais do banco"""
    if not os.path.exists(DATABASE):
        print("❌ Banco de dados não encontrado!")
        return
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"\n{'='*80}")
    print("📊 DADOS ATUAIS NO BANCO DE DADOS")
    print(f"{'='*80}\n")
    
    # Entrevistas
    cursor.execute("SELECT COUNT(*) FROM interviews")
    interviews_count = cursor.fetchone()[0]
    print(f"Entrevistas: {interviews_count}")
    
    if interviews_count > 0:
        cursor.execute("SELECT id, name, date FROM interviews ORDER BY id LIMIT 5")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  • ID {row['id']:3d} - {row['name'] or 'Sem nome'} ({row['date'] or 'Sem data'})")
        if interviews_count > 5:
            print(f"  ... e mais {interviews_count - 5}")
    
    # Cargos
    cursor.execute("SELECT COUNT(*) FROM positions")
    positions_count = cursor.fetchone()[0]
    print(f"\nCargos: {positions_count}")
    
    if positions_count > 0:
        cursor.execute("SELECT id, position, vacancies FROM positions ORDER BY id")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  • ID {row['id']:3d} - {row['position']} ({row['vacancies']} vagas)")
    
    # Perguntas globais
    cursor.execute("SELECT COUNT(*) FROM global_questions")
    questions_count = cursor.fetchone()[0]
    print(f"\nPerguntas globais: {questions_count}")
    
    if questions_count > 0:
        cursor.execute("SELECT id, question, position_id FROM global_questions ORDER BY id LIMIT 5")
        rows = cursor.fetchall()
        for row in rows:
            tipo = "Geral" if not row['position_id'] else f"Cargo {row['position_id']}"
            question_preview = row['question'][:50] + "..." if len(row['question']) > 50 else row['question']
            print(f"  • ID {row['id']:3d} ({tipo}) - {question_preview}")
        if questions_count > 5:
            print(f"  ... e mais {questions_count - 5}")
    
    # Arquivos de áudio
    if os.path.exists(UPLOADS_DIR):
        audio_files = [f for f in os.listdir(UPLOADS_DIR) if f.startswith('interview_')]
        print(f"\nArquivos de áudio: {len(audio_files)}")
        if len(audio_files) > 0:
            total_size = sum(os.path.getsize(os.path.join(UPLOADS_DIR, f)) for f in audio_files) / 1024 / 1024
            print(f"  Espaço ocupado: {total_size:.2f} MB")
    
    print(f"\n{'='*80}\n")
    conn.close()

def main():
    parser = argparse.ArgumentParser(
        description="Limpa TODOS os dados do banco de dados",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python clear_database.py --show          # Apenas ver dados atuais
  python clear_database.py --confirm       # Limpar tudo (com backup)
  python clear_database.py --confirm --no-backup  # Limpar sem backup (perigoso!)
        """
    )
    parser.add_argument("--confirm", action="store_true", help="Confirmar limpeza do banco")
    parser.add_argument("--no-backup", action="store_true", help="Não criar backup (não recomendado)")
    parser.add_argument("--show", action="store_true", help="Apenas mostrar dados atuais")
    
    args = parser.parse_args()
    
    if args.show:
        show_current_data()
        return
    
    if not args.confirm:
        print("❌ ATENÇÃO: Esta ação irá DELETAR TODOS OS DADOS!")
        print("   - Todas as entrevistas")
        print("   - Todos os cargos")
        print("   - Todas as perguntas")
        print("   - Todos os arquivos de áudio")
        print()
        print("Para confirmar, execute:")
        print("  python clear_database.py --confirm")
        print()
        print("Para ver dados atuais:")
        print("  python clear_database.py --show")
        return
    
    # Mostrar dados antes de limpar
    show_current_data()
    
    # Confirmação final
    print("⚠️  ÚLTIMA CONFIRMAÇÃO!")
    print("Todos os dados serão DELETADOS permanentemente.")
    if not args.no_backup:
        print("(Um backup será criado antes)")
    else:
        print("⚠️  SEM BACKUP - dados serão perdidos para sempre!")
    
    response = input("\nDigite 'DELETAR TUDO' para confirmar: ")
    
    if response == "DELETAR TUDO":
        clear_all_data(skip_backup=args.no_backup)
    else:
        print("\n❌ Cancelado. Nenhum dado foi alterado.")

if __name__ == "__main__":
    main()

