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
            description TEXT NOT NULL
        )
    """)

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
            FOREIGN KEY (position_id) REFERENCES positions(id)
        )
    """)

    conn.commit()
    conn.close()
