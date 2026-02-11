from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.category import Category
from app.schemas.budget import BudgetCreate, BudgetResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.alert import Alert

router = APIRouter(prefix="/budget", tags=["Budget"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=BudgetResponse)
def set_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == budget.category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget.category_id
    ).first()

    if existing:
        existing.monthly_limit = budget.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing

    new_budget = Budget(
        user_id=current_user.id,
        category_id=budget.category_id,
        monthly_limit=budget.monthly_limit
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget


@router.get("/usage/{category_id}")
def budget_usage(
    category_id: int,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if month:
        year, month_num = map(int, month.split("-"))
    else:
        today = date.today()
        year, month_num = today.year, today.month

    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == category_id
    ).first()

    if not budget:
        return {"used": 0, "limit": 0, "percentage": 0}

    spent = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == category_id,
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month_num,
        )
        .scalar()
        or 0
    )

    percentage = round((spent / budget.monthly_limit) * 100, 2)

    return {
        "used": spent,
        "limit": budget.monthly_limit,
        "percentage": percentage
    }


@router.post("/check-alerts/{category_id}")
def check_budget_alerts(
    category_id: int,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if month:
        try:
            year, month_num = map(int, month.split("-"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Month must be in YYYY-MM format"
            )
    else:
        today = date.today()
        year, month_num = today.year, today.month

    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.type == "income":
        db.query(Alert).filter(
            Alert.user_id == current_user.id,
            Alert.category_id == category_id,
            Alert.year == year,
            Alert.month == month_num
        ).delete()
        db.commit()
        return {"status": "income_category"}

    usage = budget_usage(
        category_id,
        f"{year}-{month_num:02}",
        db,
        current_user
    )

    # 🔴 No budget → remove alerts
    if usage["limit"] == 0:
        db.query(Alert).filter(
            Alert.user_id == current_user.id,
            Alert.category_id == category_id,
            Alert.year == year,
            Alert.month == month_num
        ).delete()
        db.commit()
        return {"status": "no_budget"}

    percentage = usage["percentage"]

    # 🟢 Back within limit → remove alerts
    if percentage < 80:
        db.query(Alert).filter(
            Alert.user_id == current_user.id,
            Alert.category_id == category_id,
            Alert.year == year,
            Alert.month == month_num
        ).delete()
        db.commit()
        return {"status": "within_limit"}

    # ⚠️ Decide level
    if percentage >= 100:
        level = "danger"
        message = "Budget exceeded! Please reduce spending."
    else:
        level = "warning"
        message = "You have used over 80% of your budget."

    existing = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.category_id == category_id,
        Alert.year == year,
        Alert.month == month_num
    ).first()

    if existing:
        existing.level = level
        existing.message = message
    else:
        db.add(Alert(
            user_id=current_user.id,
            category_id=category_id,
            year=year,
            month=month_num,
            level=level,
            message=message
        ))

    db.commit()
    return {"status": "alert_triggered", "level": level}
