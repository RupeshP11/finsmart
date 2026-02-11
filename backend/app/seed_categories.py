from app.database import SessionLocal
from app.models.category import Category
from app.models.user import User  # REQUIRED to resolve relationship

DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Food", "type": "expense"},
    {"name": "Groceries", "type": "expense"},
    {"name": "Transport", "type": "expense"},
    {"name": "Rent", "type": "expense"},
    {"name": "Bills", "type": "expense"},
    {"name": "Entertainment", "type": "expense"},
    {"name": "Healthcare", "type": "expense"},
    {"name": "Education", "type": "expense"},
    {"name": "Shopping", "type": "expense"},
    {"name": "Travel", "type": "expense"},
    {"name": "Other", "type": "expense"},

    # Income
    {"name": "Salary", "type": "income"},
    {"name": "Freelance", "type": "income"},
    {"name": "Business", "type": "income"},
    {"name": "Interest", "type": "income"},
    {"name": "Gift", "type": "income"},
    {"name": "Other", "type": "income"},
]

def seed_categories():
    db = SessionLocal()

    existing = db.query(Category).count()
    if existing > 0:
        print("Categories already exist. Skipping seeding.")
        return

    for cat in DEFAULT_CATEGORIES:
        category = Category(
            name=cat["name"],
            type=cat["type"],
            user_id=None  # global categories
        )
        db.add(category)

    db.commit()
    db.close()
    print("Default categories seeded successfully.")

if __name__ == "__main__":
    seed_categories()
