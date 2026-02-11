import pickle
import re

# Load ML model & vectorizer
with open("app/ml/model.pkl", "rb") as f:
    model = pickle.load(f)

with open("app/ml/vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

# Rule-based keyword mapping (primary intelligence)
KEYWORD_MAP = {
    "Food": [
        "food", "foods", "meal", "meals", "lunch", "dinner", "breakfast",
        "pizza", "burger", "sandwich", "snacks", "restaurant", "hotel",
        "grocery", "groceries", "supermarket", "market", "kirana",
        "vegetable", "vegetables", "veggies", "fruits", "fruit",
        "milk", "bread", "rice", "dal", "oil", "egg", "eggs",
        "swiggy", "zomato", "blinkit", "zepto", "instamart"
    ],

    "Transport": [
        "transport", "travel", "trip", "journey", "commute",
        "uber", "ola", "rapido", "taxi", "cab", "auto",
        "bus", "metro", "train", "railway",
        "flight", "air", "airport", "ticket",
        "fuel", "petrol", "diesel", "cng", "parking", "toll"
    ],

    "Shopping": [
        "shopping", "purchase", "buy", "bought", "order",
        "amazon", "flipkart", "myntra", "ajio", "meesho",
        "clothes", "dress", "shirt", "tshirt", "jeans",
        "shoes", "sandals", "footwear", "bag", "wallet",
        "watch", "mobile", "phone", "electronics",
        "book", "books", "novel", "stationery", "pen", "notebook"
    ],

    "Bills": [
        "bill", "bills", "payment", "paid",
        "electricity", "power", "current",
        "water", "gas", "lpg",
        "wifi", "internet", "broadband",
        "mobile recharge", "recharge", "phone bill",
        "dth", "cable",
        "emi", "loan", "installment",
        "credit card", "debit card", "bank charge"
    ],

    "Healthcare": [
        "health", "medical", "medicine", "medicines",
        "doctor", "hospital", "clinic", "checkup",
        "pharmacy", "chemist", "tablet", "capsule",
        "syrup", "injection", "test", "lab",
        "scan", "xray", "blood test", "diagnosis",
        "insurance", "health insurance",
        "gym", "fitness", "workout", "exercise", "yoga",
        "sports", "swimming", "dance", "pilates", "aerobics"
    ],

    "Education": [
        "education", "study", "studies", "learning",
        "school", "college", "university",
        "fees", "tuition", "coaching",
        "course", "training", "certification",
        "exam", "test", "entrance",
        "books", "ebook", "online class", "subscription"
    ],

    "Rent": [
        "rent", "rental",
        "house rent", "home rent",
        "flat", "apartment", "room",
        "pg", "paying guest", "hostel",
        "maintenance", "society charges"
    ],

    "Entertainment": [
        "entertainment", "fun", "leisure",
        "movie", "movies", "cinema", "theatre",
        "netflix", "prime", "hotstar", "spotify",
        "music", "concert", "show",
        "game", "games", "gaming",
        "outing", "party", "club"
    ],

    "Salary": [
        "salary", "income", "credited",
        "payroll", "pay slip",
        "bonus", "incentive",
        "stipend", "allowance", "business", "freelance"
    ],
}

def predict_category(description: str):
    text = description.lower()

    # ✅ tokenize into words (removes punctuation safely)
    words = re.findall(r"\b\w+\b", text)

    # 1️⃣ Rule-based matching (whole-word match only)
    for category, keywords in KEYWORD_MAP.items():
        for keyword in keywords:
            if keyword in words:
                return {
                    "category": category,
                    "source": "rule",
                    "confidence": 1.0
                }

    # 2️⃣ ML fallback
    X = vectorizer.transform([description])
    prediction = model.predict(X)[0]

    return {
        "category": prediction,
        "source": "ml",
        "confidence": 0.6
    }
