import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

def show_triggers(df):
    corr = df.corr()
    sns.heatmap(corr, annot=True)
    plt.show()
