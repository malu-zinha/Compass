import sqlite3
import os
from dotenv import load_dotenv

DATABASE = "./interviews.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def create_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            position TEXT NOT NULL,
            skills TEXT NOT NULL,
            description TEXT NOT NULL,
            vacancies INTEGER DEFAULT 0
        )
    """)
    
    # Adicionar coluna vacancies se não existir (para tabelas antigas)
    try:
        cursor.execute("ALTER TABLE positions ADD COLUMN vacancies INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Coluna já existe

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            number TEXT,
            audio_file TEXT,
            notes TEXT,
            date TEXT,
            transcript TEXT,
            analysis TEXT,
            score INTEGER,
            position_id INTEGER,
            duration REAL,
            FOREIGN KEY (position_id) REFERENCES positions(id)
        )
    """)
    
    # Adicionar coluna duration se não existir (para tabelas antigas)
    try:
        cursor.execute("ALTER TABLE interviews ADD COLUMN duration REAL")
        print("[MIGRATION] ✅ Coluna 'duration' adicionada à tabela interviews")
    except sqlite3.OperationalError:
        pass  # Coluna já existe

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            interview_id INTEGER,
            FOREIGN KEY (interview_id) REFERENCES interviews(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS global_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            position_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (position_id) REFERENCES positions(id)
        )
    """)

    conn.commit()
    conn.close()
