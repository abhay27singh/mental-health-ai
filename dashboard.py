import pandas as pd
import matplotlib.pyplot as plt

def show_metrics():
    data = {
        "Model": ["LR", "KNN", "DT", "RF"],
        "Accuracy": [71.4, 73.5, 80.6, 81.2]
    }
    df = pd.DataFrame(data)
    plt.bar(df["Model"], df["Accuracy"])
    plt.show()
