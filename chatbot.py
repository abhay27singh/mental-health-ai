import os
import requests

# 🔑 API KEY
# Loaded from the environment first, then from .streamlit/secrets.toml as a
# fallback (parsed directly so we don't depend on Streamlit being installed).
def _get_api_key():
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key
    try:
        import tomllib
        with open(".streamlit/secrets.toml", "rb") as f:
            return tomllib.load(f).get("OPENAI_API_KEY")
    except Exception:
        return None


OPENAI_API_KEY = _get_api_key()

# 🧠 SYSTEM PROMPT
SYSTEM_PROMPT = """You are a compassionate mental health support companion.

- Talk naturally like a human
- Be supportive and calm
- Keep responses short (3-5 lines)
"""

def chatbot_response(user_message, chat_history=None):
    try:
        user_lower = user_message.lower()

        # 🚨 EMERGENCY KEYWORDS
        emergency_keywords = [
            "suicide", "kill myself", "want to die",
            "end my life", "self harm", "hurt myself"
        ]

        # 🚨 EMERGENCY RESPONSE
        if any(word in user_lower for word in emergency_keywords):
            return (
                "I'm really sorry you're feeling this way 💛\n\n"
                "🚨 Please reach out immediately:\n"
                "📞 iCall India: 9152987821\n"
                "📞 Vandrevala Foundation: 1860-2662-345\n\n"
                "You're not alone."
            )

        # =============================
        # NORMAL CHAT FLOW
        # =============================

        api_key = OPENAI_API_KEY or _get_api_key()
        if not api_key:
            return (
                "Chatbot is not configured. Please add OPENAI_API_KEY to "
                ".streamlit/secrets.toml or your environment."
            )

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if chat_history:
            chat_history = chat_history[-6:]
            for sender, text in chat_history:
                role = "user" if sender == "You" else "assistant"
                messages.append({"role": role, "content": text})

        messages.append({"role": "user", "content": user_message})

        # 🌐 API CALL (OpenAI Chat Completions)
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": messages,
                "temperature": 0.7
            },
            timeout=30
        )

        data = response.json()

        # ❌ Error handling
        if "choices" not in data:
            err = data.get("error", data)
            return f"API Error: {err}"

        # ✅ Return reply
        return data["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Error: {str(e)}"
