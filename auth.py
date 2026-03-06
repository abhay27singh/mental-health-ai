import sqlite3
import hashlib

def get_connection():
    return sqlite3.connect("database.db")

# ================= USERS =================

def create_user_table():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    """)
    conn.commit()
    conn.close()

# ================= EMOTIONS =================

def create_emotion_table():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS emotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            emotion TEXT,
            confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_emotion(username, emotion, confidence):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO emotions (username, emotion, confidence) VALUES (?, ?, ?)",
        (username, emotion, confidence)
    )
    conn.commit()
    conn.close()

def get_emotion_history(username):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT emotion, confidence, created_at FROM emotions WHERE username=? ORDER BY created_at",
        (username,)
    )
    rows = c.fetchall()
    conn.close()
    return rows

# ================= MOOD =================

def create_mood_table():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS moods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            text TEXT,
            score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_mood(username, text, score):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO moods (username, text, score) VALUES (?, ?, ?)",
        (username, text, score)
    )
    conn.commit()
    conn.close()

def get_mood_history(username):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT score, created_at FROM moods WHERE username=? ORDER BY created_at",
        (username,)
    )
    rows = c.fetchall()
    conn.close()
    return rows

# ================= AUTH =================

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(username, password):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, hash_password(password))
        )
        conn.commit()
        return True
    except:
        return False
    finally:
        conn.close()

def login_user(username, password):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (username, hash_password(password))
    )
    user = c.fetchone()
    conn.close()
    return user