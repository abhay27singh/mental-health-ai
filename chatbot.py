import requests
import os

# 🔑 API KEY
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
# OR directly:
# OPENROUTER_API_KEY = "your_api_key_here"

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

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if chat_history:
            chat_history = chat_history[-6:]
            for sender, text in chat_history:
                role = "user" if sender == "You" else "assistant"
                messages.append({"role": role, "content": text})

        messages.append({"role": "user", "content": user_message})

        # 🌐 API CALL
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": messages,
                "temperature": 0.7
            }
        )

        data = response.json()

        # ❌ Error handling
        if "choices" not in data:
            return f"API Error: {data}"

        # ✅ Return reply
        return data["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Error: {str(e)}"