import shap
import joblib
import pandas as pd

def explain_prediction(input_data):
    model = joblib.load("models/rf_model.pkl")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(pd.DataFrame([input_data]))
    return shap_values
