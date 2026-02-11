from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import user, category, transaction, savings_goal, autosave_record
from app.routes import auth, users, categories, transactions, summary, analytics
from app.routes import budget
from app.routes import categorize
from app.routes import insights
from app.routes import sip
from app.routes import investment
from app.routes import savings
from app.routes import alerts
from app.routes import ai
from app.routes import markets
from app.routes import savings_goals
from app.routes import savings_analytics
import os


app = FastAPI(title="FinSmart API")

# Read allowed origins from environment variable (comma-separated)
# Fallback to localhost for local development
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if they don't exist (preserves existing data)
Base.metadata.create_all(bind=engine)

# Seed default categories on startup (only if empty)
from app.seed_categories import seed_categories
seed_categories()

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(summary.router)
app.include_router(analytics.router)
app.include_router(budget.router)
app.include_router(categorize.router)
app.include_router(insights.router)
app.include_router(sip.router)
app.include_router(investment.router)
app.include_router(savings.router)
app.include_router(savings_goals.router)
app.include_router(savings_analytics.router)
app.include_router(alerts.router)
app.include_router(ai.router)
app.include_router(markets.router)


@app.get("/")
def root():
    return {"message": "FinSmart backend is running 🚀"}
