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
    # Add profile columns to existing databases if they're missing.
    existing = {row[1] for row in c.execute("PRAGMA table_info(users)")}
    for col, decl in [
        ("full_name", "TEXT"),
        ("email", "TEXT"),
        ("age", "INTEGER"),
        ("gender", "TEXT"),
    ]:
        if col not in existing:
            c.execute(f"ALTER TABLE users ADD COLUMN {col} {decl}")
    conn.commit()
    conn.close()


# ================= PROFILE =================

def get_profile(username):
    conn = get_connection()
    c = conn.cursor()
    row = c.execute(
        "SELECT username, full_name, email, age, gender FROM users WHERE username=?",
        (username,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {
        "username": row[0],
        "full_name": row[1] or "",
        "email": row[2] or "",
        "age": row[3],
        "gender": row[4] or "",
    }


def update_profile(username, full_name, email, age, gender):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "UPDATE users SET full_name=?, email=?, age=?, gender=? WHERE username=?",
        (full_name, email, age, gender, username),
    )
    conn.commit()
    conn.close()


def change_password(username, current, new):
    """Verify the current password, then set the new one. Returns bool."""
    conn = get_connection()
    c = conn.cursor()
    row = c.execute(
        "SELECT password FROM users WHERE username=?", (username,)
    ).fetchone()
    if not row or row[0] != hash_password(current):
        conn.close()
        return False
    c.execute(
        "UPDATE users SET password=? WHERE username=?",
        (hash_password(new), username),
    )
    conn.commit()
    conn.close()
    return True

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