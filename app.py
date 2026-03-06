import streamlit as st
import sqlite3
import pandas as pd
import tempfile
import matplotlib.pyplot as plt
import os
from deepface import DeepFace
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet

from model import predict
from recommender import get_recommendations
from journal import analyze_mood
from chatbot import chatbot_response
from alerts import check_risk
from auth import *

# =============================
# INITIAL SETUP
# =============================

create_user_table()
create_emotion_table()
create_mood_table()

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = ""
if "captured_image" not in st.session_state:
    st.session_state.captured_image = None
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# =============================
# LOGIN / REGISTER
# =============================

if not st.session_state.logged_in:

    st.title("Mental Health AI System")

    option = st.radio("Select Option", ["Login", "Register"])
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if option == "Register":
        if st.button("Register"):
            if register_user(username, password):
                st.success("Registered successfully! Please login.")
            else:
                st.error("Username already exists.")

    if option == "Login":
        if st.button("Login"):
            if login_user(username, password):
                st.session_state.logged_in = True
                st.session_state.username = username
                st.rerun()
            else:
                st.error("Invalid credentials.")

    st.stop()

# =============================
# DASHBOARD
# =============================

st.sidebar.success(f"Logged in as {st.session_state.username}")

if st.sidebar.button("Logout"):
    st.session_state.logged_in = False
    st.rerun()

st.title("Mental Health Tracker Dashboard")

# =============================
# QUESTIONNAIRE
# =============================

st.subheader("Mental Health Questionnaire")

questions = [
    "How often do you feel stressed?",
    "Do you feel mentally exhausted?",
    "How well do you sleep?",
    "Do you feel anxious frequently?",
    "Do you feel motivated daily?"
]

answers = []
for i, q in enumerate(questions):
    val = st.slider(f"Q{i+1}. {q}", 0, 10, 0)
    answers.append(val)

risk_prob = None

if st.button("Predict"):
    result, risk_prob = predict(answers)
    st.write("Needs Treatment:", result)
    st.write("Risk Probability:", round(risk_prob, 2))

    st.warning(check_risk(risk_prob))

    severity = "low" if risk_prob < 0.4 else "moderate" if risk_prob < 0.7 else "high"

    st.subheader("Recommendations")
    for r in get_recommendations(severity):
        st.write("✔️", r)

# =============================
# MOOD JOURNAL
# =============================

st.subheader("Mood Journal")

text = st.text_area("Write how you feel")

if st.button("Analyze Mood"):
    if text.strip():
        mood_score = analyze_mood(text)
        save_mood(st.session_state.username, text, mood_score)
        st.success(f"Mood Score: {mood_score}")

# =============================
# MOOD TREND GRAPH
# =============================

st.subheader("Mood Trend")

mood_history = get_mood_history(st.session_state.username)

if mood_history:
    df = pd.DataFrame(mood_history, columns=["Score", "Date"])
    df["Date"] = pd.to_datetime(df["Date"])

    fig, ax = plt.subplots()
    ax.plot(df["Date"], df["Score"])
    ax.set_title("Mood Trend Over Time")
    ax.set_ylabel("Mood Score")
    st.pyplot(fig)
else:
    st.info("No mood history yet.")

# =============================
# EMOTION DETECTION
# =============================

st.subheader("Emotion Detection")

img_file = st.camera_input("Take a photo")

if img_file is not None:
    st.session_state.captured_image = img_file

if st.session_state.captured_image is not None:

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
        temp_file.write(st.session_state.captured_image.getvalue())
        temp_path = temp_file.name

    st.image(temp_path, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Analyze Emotion"):
            with st.spinner("Analyzing emotion..."):
                result = DeepFace.analyze(
                    img_path=temp_path,
                    actions=['emotion'],
                    enforce_detection=False,
                    silent=True
                )

                if isinstance(result, list):
                    result = result[0]

                dominant = result["dominant_emotion"]
                emotion_data = result["emotion"]
                confidence = emotion_data[dominant]

                st.success(f"Detected Emotion: {dominant.upper()}")

                for e, s in emotion_data.items():
                    st.write(f"{e}: {round(s,2)}%")

                save_emotion(st.session_state.username, dominant, confidence)

    with col2:
        if st.button("Delete Picture"):
            st.session_state.captured_image = None
            st.rerun()

# =============================
# EMOTION TREND GRAPH
# =============================

st.subheader("Emotion Trend")

emotion_history = get_emotion_history(st.session_state.username)

if emotion_history:
    df = pd.DataFrame(emotion_history, columns=["Emotion", "Confidence", "Date"])
    emotion_counts = df["Emotion"].value_counts()

    fig, ax = plt.subplots()
    emotion_counts.plot(kind="bar", ax=ax)
    ax.set_title("Emotion Frequency")
    st.pyplot(fig)

# =============================
# RISK vs MOOD COMPARISON
# =============================

if mood_history and risk_prob:
    st.subheader("Risk vs Mood Comparison")

    avg_mood = sum([m[0] for m in mood_history]) / len(mood_history)

    fig, ax = plt.subplots()
    ax.bar(["Risk Probability", "Average Mood"], [risk_prob, avg_mood])
    st.pyplot(fig)

# =============================
# AI CHATBOT
# =============================

st.subheader("AI Chatbot")

user_msg = st.text_input("Talk to AI")

if st.button("Send"):
    if user_msg.strip():
        response = chatbot_response(user_msg)

        st.session_state.chat_history.append(("You", user_msg))
        st.session_state.chat_history.append(("AI", response))

for sender, msg in st.session_state.chat_history:
    st.write(f"**{sender}:** {msg}")

# =============================
# PDF REPORT
# =============================

st.subheader("Download Full Mental Health Report")

if st.button("Generate PDF Report"):

    filename = "report.pdf"
    doc = SimpleDocTemplate(filename)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("Mental Health Report", styles["Heading1"]))
    elements.append(Spacer(1, 20))

    if mood_history:
        elements.append(Paragraph("Mood History", styles["Heading2"]))
        elements.append(Spacer(1, 10))
        table = Table([["Score", "Date"]] + mood_history)
        elements.append(table)

    if emotion_history:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Emotion History", styles["Heading2"]))
        elements.append(Spacer(1, 10))
        table = Table([["Emotion", "Confidence", "Date"]] + emotion_history)
        elements.append(table)

    doc.build(elements)

    with open(filename, "rb") as f:
        st.download_button("Download Report", f, file_name=filename)

    os.remove(filename)