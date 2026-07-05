# 🧠 Mental Health AI System (Mind Scope)

An AI-powered mental health analysis system that helps users track mood, detect emotions, and get intelligent recommendations.

---

## 🚀 Features

### 👤 User Features

- Mental Health Questionnaire with ML risk prediction
- **Explainable AI (XAI):** per-factor "why this result?" attribution for every prediction
- **Multimodal fusion:** the latest facial-emotion scan is fused into the risk model
- **Model comparison:** Logistic Regression vs KNN vs Decision Tree vs Random Forest
- Mood Journal & Trend Graph
- Emotion Detection using Camera (DeepFace + RetinaFace)
- Profile management (edit details, change password)
- AI Chatbot Support
- Emergency Detection & Helpline Suggestion

### 👑 Admin Features

- View all users
- Monitor user mood & emotion data
- Change user passwords
- Delete users

---

## 🛠 Tech Stack

- **Frontend:** React (Vite) + Recharts
- **Backend:** FastAPI (Python)
- **Database:** SQLite
- **Machine Learning:** Random Forest
- **NLP:** TextBlob
- **Emotion Detection:** DeepFace
- **Chatbot API:** OpenAI (gpt-4o-mini)

The app is split into a Python REST API (`api.py`) that reuses the original
ML/NLP/emotion logic, and a React single-page app (`frontend/`) that consumes it.

---

## 📊 Workflow

User Input → ML Prediction → Emotion Detection → Recommendations → Chatbot Support

---

## 📸 Screenshots

### 🔐 Login Page

(Add screenshot here)

### 📊 Dashboard

(Add screenshot here)

### 😊 Emotion Detection

(Add screenshot here)

### 🤖 Chatbot

(Add screenshot here)

### 👑 Admin Panel

(Add screenshot here)

---

## ⚙️ Installation & Running

### Quick start

After installing dependencies once (see below), run both servers together:

```bash
./start.sh   # starts backend (:8000) and frontend (:5173) in the background
./stop.sh    # stops them
```

Logs are written to `.run/backend.log` and `.run/frontend.log`.

---

The project has two parts that run together: a FastAPI backend and a React frontend.

### 1. Backend (FastAPI)

```bash
git clone https://github.com/abhay27singh/mental-health-ai.git
cd mental-health-ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Optional: enable the AI chatbot (emergency replies work without it)
export OPENAI_API_KEY="sk-..."

uvicorn api:app --reload --port 8000
```

The API is now at http://localhost:8000 (interactive docs at `/docs`).

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the
backend on port 8000, so just run both at once.

To build for production: `npm run build` (output in `frontend/dist/`).
