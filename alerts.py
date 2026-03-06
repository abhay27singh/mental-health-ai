def check_risk(probability):
    if probability > 0.8:
        return "⚠️ HIGH RISK: Contact helpline immediately"
    return "No emergency detected"
