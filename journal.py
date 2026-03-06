from textblob import TextBlob
import sqlite3

def analyze_mood(text):
    blob = TextBlob(text)
    return blob.sentiment.polarity

def save_journal(user, mood, text):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS journal (user, mood, text)")
    c.execute("INSERT INTO journal VALUES (?,?,?)", (user, mood, text))
    conn.commit()
