def get_recommendations(level):
    data = {
        "low": [
            "Practice deep breathing (5 minutes)",
            "Listen to calming music",
            "Go for a short walk"
        ],
        "moderate": [
            "Meditate for 10 minutes",
            "Reduce screen time",
            "Exercise or yoga",
            "Write a journal"
        ],
        "high": [
            "Consult a mental health professional",
            "Call a trusted friend or family member",
            "Use a mental health helpline",
            "Maintain proper sleep routine"
        ]
    }
    return data.get(level, [])
