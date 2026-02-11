from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.investment import InvestmentRequest, InvestmentResponse

router = APIRouter(prefix="/investment", tags=["Investment Advisor"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/advice", response_model=InvestmentResponse)
def investment_advice(
    payload: InvestmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1️⃣ Calculate income & expenses for the specified month
    income_query = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
        )
    )
    
    expenses_query = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
        )
    )
    
    # Apply month/year filter if provided
    if payload.month and payload.year:
        income_query = income_query.filter(
            func.extract('month', Transaction.date) == payload.month,
            func.extract('year', Transaction.date) == payload.year
        )
        expenses_query = expenses_query.filter(
            func.extract('month', Transaction.date) == payload.month,
            func.extract('year', Transaction.date) == payload.year
        )
    
    income = income_query.scalar() or 0
    expenses = expenses_query.scalar() or 0

    # Safety fallback
    if income <= 0:
        return {
            "allocation": {
                "equity": 0,
                "debt": 70,
                "gold": 10,
                "emergency": 20,
            },
            "message": "Since income data is limited, focus on safety and building an emergency fund first.",
            "investable_amount": 0,
            "monthly_income": income,
            "monthly_expenses": abs(expenses)
        }

    # 2️⃣ Base allocation by risk profile
    if payload.risk_profile == "low":
        allocation = {"equity": 30, "debt": 45, "gold": 15, "emergency": 10}
        msg = "Low-risk profile favors stability through debt and gold with limited equity exposure."
    elif payload.risk_profile == "medium":
        allocation = {"equity": 50, "debt": 30, "gold": 10, "emergency": 10}
        msg = "Balanced profile aims for growth with controlled risk and adequate safety."
    else:  # high
        allocation = {"equity": 65, "debt": 20, "gold": 5, "emergency": 10}
        msg = "High-risk profile prioritizes long-term growth through higher equity exposure."

    # 3️⃣ Emergency fund adjustment (simple & explainable)
    monthly_expense = abs(expenses)
    emergency_target = monthly_expense * 6

    # If expenses are high relative to income, boost emergency
    if monthly_expense > 0 and monthly_expense > income * 0.6:
        allocation["emergency"] += 5
        allocation["equity"] -= 5
        msg += " Due to higher expenses, extra emphasis is placed on emergency savings."

    # Calculate investable amount (income minus expenses)
    investable_amount = max(0, income - monthly_expense)

    return {
        "allocation": allocation,
        "message": msg,
        "investable_amount": investable_amount,
        "monthly_income": income,
        "monthly_expenses": monthly_expense
    }
