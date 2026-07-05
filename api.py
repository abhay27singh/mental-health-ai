"""
FastAPI backend for the Mental Health AI system.

This replaces the Streamlit UI (app.py) with a REST API that the React
frontend (in frontend/) consumes. All the heavy lifting is reused from the
existing Python modules: model.py, chatbot.py, journal.py, recommender.py,
alerts.py and auth.py.

Run with:
    uvicorn api:app --reload --port 8000
"""

import os
import sqlite3
import hashlib
import secrets
import tempfile

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Reuse the existing application logic.
from model import predict, explain, get_metrics
from recommender import get_recommendations
from journal import analyze_mood
from chatbot import chatbot_response
from alerts import check_risk
from auth import (
    create_user_table,
    create_emotion_table,
    create_mood_table,
    register_user,
    login_user,
    save_mood,
    get_mood_history,
    save_emotion,
    get_emotion_history,
    get_profile,
    update_profile,
    change_password,
)

DB_PATH = "database.db"

app = FastAPI(title="Mental Health AI API")

# Allow the Vite dev server (and any local origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    create_user_table()
    create_emotion_table()
    create_mood_table()
    # Train (or load) the ML models up front so the first prediction is fast.
    from model import train_if_needed

    train_if_needed()


# ============================================================
# Auth helpers (simple in-memory bearer tokens)
# ============================================================

# token -> username. Fine for a single-process dev/demo deployment.
_TOKENS: dict[str, str] = {}


def _issue_token(username: str) -> str:
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = username
    return token


def current_user(authorization: str | None = Header(default=None)) -> str:
    """Resolve the username from the `Authorization: Bearer <token>` header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    username = _TOKENS.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return username


def require_admin(username: str = Depends(current_user)) -> str:
    if username != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return username


# ============================================================
# Schemas
# ============================================================

class Credentials(BaseModel):
    username: str
    password: str


class PredictRequest(BaseModel):
    answers: list[int]


class MoodRequest(BaseModel):
    text: str


class ChatMessage(BaseModel):
    sender: str  # "You" or "AI"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class PasswordUpdate(BaseModel):
    password: str


class ProfileUpdate(BaseModel):
    full_name: str = ""
    email: str = ""
    age: int | None = None
    gender: str = ""


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ============================================================
# Auth endpoints
# ============================================================

@app.post("/api/register")
def register(creds: Credentials):
    if creds.username == "admin":
        raise HTTPException(status_code=400, detail="Admin already reserved")
    if not creds.username or not creds.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if register_user(creds.username, creds.password):
        return {"message": "Registered successfully"}
    raise HTTPException(status_code=409, detail="User already exists")


@app.post("/api/login")
def login(creds: Credentials):
    if login_user(creds.username, creds.password):
        token = _issue_token(creds.username)
        return {
            "token": token,
            "username": creds.username,
            "is_admin": creds.username == "admin",
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/api/logout")
def logout(authorization: str | None = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        _TOKENS.pop(authorization.split(" ", 1)[1], None)
    return {"message": "Logged out"}


# ============================================================
# Profile (available to every signed-in account)
# ============================================================

@app.get("/api/profile")
def read_profile(user: str = Depends(current_user)):
    profile = get_profile(user)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile["is_admin"] = user == "admin"
    return profile


@app.put("/api/profile")
def edit_profile(body: ProfileUpdate, user: str = Depends(current_user)):
    update_profile(user, body.full_name, body.email, body.age, body.gender)
    return {"message": "Profile updated"}


@app.post("/api/profile/password")
def change_own_password(body: PasswordChange, user: str = Depends(current_user)):
    if len(body.new_password) < 3:
        raise HTTPException(status_code=400, detail="New password is too short")
    if not change_password(user, body.current_password, body.new_password):
        raise HTTPException(status_code=403, detail="Current password is incorrect")
    return {"message": "Password changed"}


# ============================================================
# Dashboard: prediction, recommendations, mood journal
# ============================================================

# Map a detected facial emotion to a 0–10 "emotional distress" value that is
# fused into the risk model (early/multimodal fusion). Blended toward the
# neutral midpoint by the detector's confidence.
_NEG_EMOTIONS = {"sad", "angry", "fear", "disgust"}
_POS_EMOTIONS = {"happy"}


def _emotion_to_value(emotion: str, confidence: float) -> float:
    target = 8.0 if emotion in _NEG_EMOTIONS else 2.0 if emotion in _POS_EMOTIONS else 5.0
    return round(5.0 + (target - 5.0) * (confidence / 100.0), 2)


def _latest_emotion(user: str):
    """Most recent facial-emotion scan for this user, or None."""
    rows = get_emotion_history(user)
    if not rows:
        return None
    emotion, confidence, created_at = rows[-1]
    return {"emotion": emotion, "confidence": float(confidence), "at": created_at}


@app.post("/api/predict")
def predict_risk(req: PredictRequest, user: str = Depends(current_user)):
    if len(req.answers) != 5:
        raise HTTPException(status_code=400, detail="Expected 5 answers")

    # --- Multimodal fusion: pull in the user's most recent facial emotion ---
    latest = _latest_emotion(user)
    if latest:
        emotion_value = _emotion_to_value(latest["emotion"], latest["confidence"])
        fusion = {
            "used": True,
            "emotion": latest["emotion"],
            "confidence": round(latest["confidence"], 1),
        }
    else:
        emotion_value = None  # model falls back to a neutral default
        fusion = {"used": False}

    features = list(req.answers) + ([emotion_value] if emotion_value is not None else [])
    result, prob = predict(features)
    prob = float(prob)
    severity = "low" if prob < 0.4 else "moderate" if prob < 0.7 else "high"

    # XAI: signed per-factor attribution. Hide the emotion factor when no scan
    # was fused, so we don't imply an input the user never provided.
    explanation = explain(features)
    if not fusion["used"]:
        explanation = [e for e in explanation if e["feature"] != "Emotion"]

    return {
        "risk": int(result),
        "probability": round(prob, 2),
        "alert": check_risk(prob),
        "severity": severity,
        "recommendations": get_recommendations(severity),
        "fusion": fusion,
        "explanation": explanation,
    }


@app.get("/api/models/metrics")
def model_metrics(user: str = Depends(current_user)):
    """Test accuracies of the compared models (LR, KNN, DT, RF)."""
    return get_metrics()


@app.post("/api/mood")
def add_mood(req: MoodRequest, user: str = Depends(current_user)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    score = analyze_mood(req.text)
    save_mood(user, req.text, score)
    return {"score": round(float(score), 3)}


@app.get("/api/mood/history")
def mood_history(user: str = Depends(current_user)):
    rows = get_mood_history(user)
    return [{"score": float(s), "date": d} for s, d in rows]


# ============================================================
# Chatbot
# ============================================================

@app.post("/api/chat")
def chat(req: ChatRequest, user: str = Depends(current_user)):
    history = [(m.sender, m.text) for m in req.history]
    response = chatbot_response(req.message, history)
    is_emergency = "🚨" in response
    return {"response": response, "emergency": is_emergency}


# ============================================================
# Emotion detection (DeepFace)
# ============================================================

_SUGGESTIONS = {
    "sad": "Talk to someone, listen to music, or write your thoughts.",
    "angry": "Take deep breaths and step away from the situation.",
    "fear": "Practice grounding techniques and slow breathing.",
    "happy": "Great! Keep doing what makes you happy.",
}
_DEFAULT_SUGGESTION = "Stay mindful and take breaks."


# RetinaFace gives a much more accurate face crop than the default OpenCV
# detector, which is the single biggest factor in emotion accuracy. We require
# a real face to be detected so we never analyze a mis-cropped / empty frame.
_DETECTOR_BACKEND = "retinaface"


@app.post("/api/emotion")
async def detect_emotion(
    image: UploadFile = File(...), user: str = Depends(current_user)
):
    # DeepFace is imported lazily so the rest of the API still boots fast.
    from deepface import DeepFace

    contents = await image.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        f.write(contents)
        path = f.name

    try:
        result = DeepFace.analyze(
            path,
            actions=["emotion"],
            detector_backend=_DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )
    except ValueError:
        # DeepFace raises ValueError when no face is found.
        raise HTTPException(
            status_code=422,
            detail="No face detected. Center your face in the frame with good, even lighting.",
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not analyze image: {e}")
    finally:
        os.unlink(path)

    if isinstance(result, list):
        result = result[0]

    scores = {k: round(float(v), 2) for k, v in result["emotion"].items()}
    emotion = result["dominant_emotion"]
    confidence = float(result["emotion"][emotion])
    save_emotion(user, emotion, confidence)

    return {
        "emotion": emotion,
        "confidence": round(confidence, 2),
        "suggestion": _SUGGESTIONS.get(emotion, _DEFAULT_SUGGESTION),
        # Full distribution, sorted high → low, so the UI can show a breakdown.
        "scores": dict(sorted(scores.items(), key=lambda kv: kv[1], reverse=True)),
    }


# ============================================================
# Admin
# ============================================================

@app.get("/api/admin/users")
def admin_users(admin: str = Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("SELECT username FROM users").fetchall()
    conn.close()
    return [u[0] for u in rows if u[0] != "admin"]


@app.get("/api/admin/user/{username}")
def admin_user_detail(username: str, admin: str = Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    moods = conn.execute(
        "SELECT score, created_at FROM moods WHERE username=? ORDER BY created_at",
        (username,),
    ).fetchall()
    emotions = conn.execute(
        "SELECT emotion FROM emotions WHERE username=?", (username,)
    ).fetchall()
    conn.close()

    emotion_counts: dict[str, int] = {}
    for (e,) in emotions:
        emotion_counts[e] = emotion_counts.get(e, 0) + 1

    return {
        "username": username,
        "moods": [{"score": float(s), "date": d} for s, d in moods],
        "emotion_counts": emotion_counts,
    }


@app.post("/api/admin/user/{username}/password")
def admin_update_password(
    username: str, body: PasswordUpdate, admin: str = Depends(require_admin)
):
    hashed = hashlib.sha256(body.password.encode()).hexdigest()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE users SET password=? WHERE username=?", (hashed, username)
    )
    conn.commit()
    conn.close()
    return {"message": "Password updated"}


@app.delete("/api/admin/user/{username}")
def admin_delete_user(username: str, admin: str = Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM users WHERE username=?", (username,))
    conn.execute("DELETE FROM moods WHERE username=?", (username,))
    conn.execute("DELETE FROM emotions WHERE username=?", (username,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
