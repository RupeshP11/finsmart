import os
import pickle

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# -------------------------
# Training data (simple & explainable)
# -------------------------
texts = [
    "salary credited",
    "monthly salary",
    "office salary",

    "grocery shopping",
    "bought vegetables",
    "food from restaurant",
    "lunch at cafe",

    "uber ride",
    "ola cab",
    "bus ticket",
    "metro recharge",

    "electricity bill",
    "water bill",
    "mobile recharge",

    "netflix subscription",
    "spotify premium",
]

labels = [
    "Income",
    "Income",
    "Income",

    "Food",
    "Food",
    "Food",
    "Food",

    "Transport",
    "Transport",
    "Transport",
    "Transport",

    "Bills",
    "Bills",
    "Bills",

    "Entertainment",
    "Entertainment",
]

# -------------------------
# Vectorizer + Model
# -------------------------
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

model = LogisticRegression()
model.fit(X, labels)

# -------------------------
# Save model files safely
# -------------------------
BASE_DIR = os.path.dirname(__file__)

model_path = os.path.join(BASE_DIR, "model.pkl")
vectorizer_path = os.path.join(BASE_DIR, "vectorizer.pkl")

with open(model_path, "wb") as f:
    pickle.dump(model, f)

with open(vectorizer_path, "wb") as f:
    pickle.dump(vectorizer, f)

print("✅ ML model trained and saved successfully")
