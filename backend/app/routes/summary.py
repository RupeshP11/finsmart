from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.category import Category
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.summary import MonthlySummaryResponse

router = APIRouter(prefix="/summary", tags=["Summary"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/monthly", response_model=MonthlySummaryResponse)
def get_monthly_summary(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income_total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month
        )
        .scalar()
    )

    expense_total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month
        )
        .scalar()
    )

    return {
        "year": year,
        "month": month,
        "total_income": income_total,
        "total_expense": expense_total,
        "savings": income_total - expense_total
    }
