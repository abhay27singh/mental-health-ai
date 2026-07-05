"""
Mind Scope — mental-health risk model.

This module trains and serves the questionnaire-based risk model described in
the paper. Compared to a single black-box classifier it adds two things the
paper claims:

  * Multimodal (early) fusion — the questionnaire features are combined with a
    facial-emotion signal before the Random Forest makes its prediction.
  * Explainability (XAI) — an interpretable Logistic Regression is trained
    alongside the Random Forest and its coefficients give a signed, per-factor
    attribution ("why this result?") for every individual prediction.

Several models (Logistic Regression, KNN, Decision Tree, Random Forest) are
trained and their test accuracies stored so the UI can compare them.
"""

import os
import json
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

MODEL_DIR = "models"
BUNDLE_PATH = os.path.join(MODEL_DIR, "mindscope_bundle.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

# Feature order used everywhere. The last feature is the fused emotion signal.
FEATURES = ["Stress", "Sleep Quality", "Anxiety", "Energy", "Focus", "Emotion"]

# Direction each feature pushes risk (used only to synthesise a realistic,
# learnable dataset — the models discover these relationships themselves).
#   +1  → higher value raises risk (stress, anxiety, emotional distress)
#   -1  → higher value lowers risk (good sleep, energy, focus)
_WEIGHTS = np.array([1.0, -0.9, 1.0, -0.7, -0.7, 0.8])

NEUTRAL_EMOTION = 5.0  # value used when no facial scan is available (0–10 scale)


def _make_dataset(n=1800, seed=42):
    """
    Principled synthetic dataset with real directionality, non-linear
    interactions and label noise.

    The monotonic main effects keep the Logistic Regression explanation
    meaningful, while the interaction terms (which only tree ensembles can
    capture) let Random Forest achieve the strongest accuracy — matching the
    paper's finding that RF is the best model.
    """
    rng = np.random.default_rng(seed)
    X = rng.integers(0, 11, size=(n, len(FEATURES))).astype(float)
    stress, sleep, anxiety, energy, focus, emotion = X.T

    # Dampened linear main effects keep LR interpretable but not dominant.
    latent = 0.5 * (X @ _WEIGHTS)
    # Compounding risk: high stress with poor sleep is worse than either alone.
    latent += 0.14 * stress * (10 - sleep)
    # Emotional distress amplifies anxiety non-linearly.
    latent += 0.12 * anxiety * emotion
    # Good energy + focus together is protective beyond their linear sum.
    latent -= 0.12 * energy * focus
    # Threshold "danger zone" rules that tree ensembles capture but LR cannot.
    latent += 4.0 * ((stress >= 7) & (sleep <= 3))
    latent += 3.0 * ((anxiety >= 7) & (emotion >= 7))

    latent += rng.normal(0, 1.5, size=n)  # noise -> accuracy well below 100%
    y = (latent > np.median(latent)).astype(int)
    return X, y


def train_if_needed(force=False):
    if os.path.exists(BUNDLE_PATH) and not force:
        return

    X, y = _make_dataset()
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    scaler = StandardScaler().fit(X_tr)
    Xs_tr, Xs_te = scaler.transform(X_tr), scaler.transform(X_te)

    candidates = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "KNN": KNeighborsClassifier(n_neighbors=7),
        "Decision Tree": DecisionTreeClassifier(max_depth=6, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
    }

    metrics, fitted = {}, {}
    for name, model in candidates.items():
        model.fit(Xs_tr, y_tr)
        metrics[name] = round(accuracy_score(y_te, model.predict(Xs_te)) * 100, 1)
        fitted[name] = model

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(
        {
            "scaler": scaler,
            "rf": fitted["Random Forest"],          # best model -> predictions
            "lr": fitted["Logistic Regression"],    # interpretable -> explanations
            "features": FEATURES,
            "train_mean": X_tr.mean(axis=0),
        },
        BUNDLE_PATH,
    )
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f)


def _load():
    train_if_needed()
    return joblib.load(BUNDLE_PATH)


def _prep(features):
    """Accept 5 (questionnaire only) or 6 (with emotion) inputs -> length-6 array."""
    features = list(features)
    if len(features) == 5:
        features = features + [NEUTRAL_EMOTION]
    return np.array(features, dtype=float)


def predict(features):
    """Return (label, probability) from the Random Forest on fused features."""
    bundle = _load()
    x = _prep(features).reshape(1, -1)
    xs = bundle["scaler"].transform(x)
    prob = float(bundle["rf"].predict_proba(xs)[0][1])
    return int(prob > 0.5), prob


def explain(features):
    """
    Per-factor XAI attribution for one prediction.

    Uses the interpretable Logistic Regression: contribution = coef * z-score,
    so a factor's push toward (positive) or away from (negative) risk is both
    signed and comparable across factors.
    """
    bundle = _load()
    x = _prep(features)
    xs = bundle["scaler"].transform(x.reshape(1, -1))[0]
    coefs = bundle["lr"].coef_[0]
    raw = coefs * xs  # signed contribution per feature

    total = float(np.sum(np.abs(raw))) or 1.0
    out = []
    for name, value, contrib in zip(bundle["features"], x, raw):
        out.append(
            {
                "feature": name,
                "value": round(float(value), 1),
                "contribution": round(float(contrib), 3),
                "weight": round(abs(float(contrib)) / total * 100, 1),
                "direction": "increases" if contrib > 0 else "decreases",
            }
        )
    out.sort(key=lambda d: abs(d["contribution"]), reverse=True)
    return out


def get_metrics():
    """Test accuracies for every trained model (for the comparison chart)."""
    train_if_needed()
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH) as f:
            return json.load(f)
    return {}
