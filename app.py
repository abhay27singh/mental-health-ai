import streamlit as st
import pandas as pd
import tempfile
import plotly.graph_objects as go
from deepface import DeepFace
import sqlite3
import hashlib

from model import predict
from recommender import get_recommendations
from journal import analyze_mood
from chatbot import chatbot_response
from alerts import check_risk
from auth import *

# ================= CONFIG =================
st.set_page_config(page_title="Mental Health AI", layout="wide")

# ================= STYLE =================
st.markdown("""
<style>
.main {background-color:#0e1117;}
.card {background:#161b22;padding:25px;border-radius:12px;}
.chat-user {text-align:right;background:#2ecc71;padding:10px;border-radius:10px;margin:5px;color:white;}
.chat-ai {text-align:left;background:#34495e;padding:10px;border-radius:10px;margin:5px;color:white;}
</style>
""", unsafe_allow_html=True)

# ================= INIT =================
create_user_table()
create_emotion_table()
create_mood_table()

# ================= SESSION =================
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = ""
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# ================= LOGIN =================
if not st.session_state.logged_in:
    st.markdown("<h1 style='text-align:center;'>🔐 Mental Health AI System</h1>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1,2,1])
    with col2:
        st.markdown("<div class='card'>", unsafe_allow_html=True)

        option = st.radio("Select Option", ["Login", "Register"])
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")

        if option == "Register":
            if st.button("Register"):
                if username == "admin":
                    st.error("Admin already reserved ❌")
                elif register_user(username, password):
                    st.success("Registered successfully")
                else:
                    st.error("User exists")

        if option == "Login":
            if st.button("Login"):
                if login_user(username, password):
                    st.session_state.logged_in = True
                    st.session_state.username = username
                    st.rerun()
                else:
                    st.error("Invalid credentials")

        st.markdown("</div>", unsafe_allow_html=True)

    st.stop()

# ================= SIDEBAR =================
st.sidebar.success(f"Logged in as {st.session_state.username}")

if st.sidebar.button("Logout"):
    st.session_state.logged_in = False
    st.rerun()

st.title("🧠 Mental Health Tracker Dashboard")

# ================= TABS =================
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Dashboard",
    "😊 Emotion",
    "🤖 Chatbot",
    "🛠 Admin"
])

# ================= DASHBOARD =================
with tab1:
    st.subheader("🧠 Mental Health Assessment")

    questions = [
        ("Stress Level", "How stressed have you felt recently?"),
        ("Sleep Quality", "How well have you been sleeping?"),
        ("Anxiety Level", "How often do you feel anxious?"),
        ("Energy Level", "How energetic do you feel daily?"),
        ("Focus Level", "How well can you concentrate?")
    ]

    answers = []
    for i, (title, desc) in enumerate(questions):
        st.markdown(f"### Q{i+1}. {title}")
        st.caption(desc)
        val = st.slider("", 0, 10, 0, key=f"slider_{i}")
        answers.append(val)

    if st.button("Predict"):
        result, prob = predict(answers)
        st.success(f"Risk Probability: {round(prob,2)}")
        st.warning(check_risk(prob))

        severity = "low" if prob < 0.4 else "moderate" if prob < 0.7 else "high"

        st.subheader("Recommendations")
        for r in get_recommendations(severity):
            st.write("✔️", r)

    # Mood Journal
    st.subheader("📝 Mood Journal")
    text = st.text_area("Write how you feel")

    if st.button("Analyze Mood"):
        if text:
            score = analyze_mood(text)
            save_mood(st.session_state.username, text, score)
            st.success(f"Mood Score: {score}")

    # Mood Graph
    st.subheader("📈 Mood Trend")
    data = get_mood_history(st.session_state.username)

    if data:
        df = pd.DataFrame(data, columns=["Score", "Date"])
        df["Date"] = pd.to_datetime(df["Date"])
        df["Date_str"] = df["Date"].dt.strftime("%d-%m %I:%M %p")

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=df["Date_str"],
            y=df["Score"],
            mode='lines+markers',
            line=dict(color="#3b82f6", width=3),
            fill='tozeroy'
        ))
        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)

# ================= EMOTION =================
with tab2:
    st.subheader("😊 Emotion Detection")

    img = st.camera_input("Take Photo")

    if img:
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(img.getvalue())
            path = f.name

        result = DeepFace.analyze(path, actions=['emotion'], enforce_detection=False)
        if isinstance(result, list):
            result = result[0]

        emotion = result["dominant_emotion"]
        conf = result["emotion"][emotion]

        save_emotion(st.session_state.username, emotion, conf)

        st.success(f"{emotion.upper()} ({round(conf,2)}%)")
        st.progress(min(int(conf), 100))

        # Suggestions
        st.subheader("💡 Suggestions")

        if emotion == "sad":
            st.info("Talk to someone, listen to music, or write your thoughts.")
        elif emotion == "angry":
            st.info("Take deep breaths and step away from the situation.")
        elif emotion == "fear":
            st.info("Practice grounding techniques and slow breathing.")
        elif emotion == "happy":
            st.success("Great! Keep doing what makes you happy.")
        else:
            st.info("Stay mindful and take breaks.")

# ================= CHATBOT =================
with tab3:
    st.subheader("💬 AI Chatbot")

    msg = st.text_input("Type your message")

    col1, col2 = st.columns(2)
    send = col1.button("Send")
    clear = col2.button("Clear Chat")

    emergency_words = ["suicide", "kill myself", "die", "end my life"]

    if send and msg:
        is_emergency = any(word in msg.lower() for word in emergency_words)

        if is_emergency:
            response = """💔 I'm really sorry you're feeling this way.

🚨 Please reach out immediately:
📞 iCall India: 9152987821  
📞 Vandrevala Foundation: 1860-2662-345  

You are not alone ❤️
"""
        else:
            response = chatbot_response(msg, st.session_state.chat_history)

        st.session_state.chat_history.append(("You", msg))
        st.session_state.chat_history.append(("AI", response))

    if clear:
        st.session_state.chat_history = []
        st.rerun()

    for sender, m in st.session_state.chat_history:
        if sender == "You":
            st.markdown(f"<div class='chat-user'>{m}</div>", unsafe_allow_html=True)
        else:
            if "🚨" in m:
                st.error(m)
            else:
                st.markdown(f"<div class='chat-ai'>🤖 {m}</div>", unsafe_allow_html=True)

# ================= ADMIN =================
with tab4:
    st.subheader("🛠 Admin Panel")

    if st.session_state.username != "admin":
        st.error("Access Denied ❌")
    else:
        st.success("Welcome Admin 👑")

        conn = sqlite3.connect("database.db")
        c = conn.cursor()

        users = c.execute("SELECT username FROM users").fetchall()
        user_list = [u[0] for u in users if u[0] != "admin"]

        selected_user = st.selectbox("Select User", user_list)

        if selected_user:
            st.subheader(f"User: {selected_user}")

            moods = c.execute("SELECT score FROM moods WHERE username=?", (selected_user,)).fetchall()
            if moods:
                df = pd.DataFrame(moods, columns=["Score"])
                st.line_chart(df)

            emotions = c.execute("SELECT emotion FROM emotions WHERE username=?", (selected_user,)).fetchall()
            if emotions:
                df2 = pd.DataFrame(emotions, columns=["Emotion"])
                st.bar_chart(df2["Emotion"].value_counts())

        new_pass = st.text_input("New Password", type="password")

        if st.button("Update Password"):
            hashed = hashlib.sha256(new_pass.encode()).hexdigest()
            c.execute("UPDATE users SET password=? WHERE username=?", (hashed, selected_user))
            conn.commit()
            st.success("Password updated")

        if st.button("Delete User"):
            c.execute("DELETE FROM users WHERE username=?", (selected_user,))
            c.execute("DELETE FROM moods WHERE username=?", (selected_user,))
            c.execute("DELETE FROM emotions WHERE username=?", (selected_user,))
            conn.commit()
            st.warning("User deleted")

        conn.close()