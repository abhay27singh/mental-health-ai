import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import os

def train_if_needed():
    if os.path.exists("models/rf.pkl"):
        return

    X = np.random.randint(0, 10, (200, 5))
    y = (X.sum(axis=1) > 25).astype(int)

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    model = RandomForestClassifier(n_estimators=100)
    model.fit(Xs, y)

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/rf.pkl")
    joblib.dump(scaler, "models/scaler.pkl")

def predict(data):
    train_if_needed()
    model = joblib.load("models/rf.pkl")
    scaler = joblib.load("models/scaler.pkl")

    X = scaler.transform([data])
    prob = model.predict_proba(X)[0][1]
    return int(prob > 0.5), prob
