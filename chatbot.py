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
                "⚠️ The AI companion isn't set up yet. Add a valid OPENAI_API_KEY "
                "(as an environment variable or in .streamlit/secrets.toml) to enable it."
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

        # ✅ Return reply
        if "choices" in data:
            return data["choices"][0]["message"]["content"]

        # ❌ Friendly error handling — never leak the API key or raw payload.
        error = data.get("error", {}) if isinstance(data, dict) else {}
        code = error.get("code") or error.get("type")

        if response.status_code == 401 or code == "invalid_api_key":
            return (
                "⚠️ The AI companion isn't available right now — the OpenAI API key "
                "is missing or invalid. Please set a valid OPENAI_API_KEY."
            )
        if response.status_code == 429 or code in ("insufficient_quota", "rate_limit_exceeded"):
            return (
                "⚠️ The AI companion is busy right now (rate limit or quota reached). "
                "Please try again in a little while."
            )
        return "⚠️ The AI companion is temporarily unavailable. Please try again in a moment."

    except requests.exceptions.RequestException:
        return "⚠️ Couldn't reach the AI service. Please check your connection and try again."
    except Exception:
        return "⚠️ Something went wrong with the AI companion. Please try again."
