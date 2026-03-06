def chatbot_response(msg):
    msg = msg.lower()
    if "sad" in msg:
        return "I'm here for you. Want to talk about it?"
    if "stress" in msg:
        return "Try slow breathing. Stress is manageable."
    if "suicide" in msg:
        return "Please contact emergency helpline immediately."
    return "Tell me more."
