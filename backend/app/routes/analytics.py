from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.category import Category
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    ExpenseByCategoryResponse,
    DailyExpenseResponse
)
from app.schemas.insight import InsightResponse
from app.models.budget import Budget
from app.schemas.savings import SavingsRequest, SavingsResponse
from app.schemas.sip import SIPRequest, SIPResponse


router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 1️⃣ Expense by category (Pie chart)
@router.get("/expense-by-category", response_model=list[ExpenseByCategoryResponse])
def expense_by_category(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total_amount")
        )
        .join(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
        )
        .group_by(Category.name)
        .all()
    )

    return results

# 2️⃣ Top expense categories
@router.get("/top-expenses", response_model=list[ExpenseByCategoryResponse])
def top_expense_categories(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total_amount")
        )
        .join(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense"
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
        .all()
    )

    return results


# 3️⃣ Daily expense trend (Line chart)
@router.get("/daily-expense", response_model=list[DailyExpenseResponse])
def daily_expense_trend(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Transaction.date,
            func.sum(Transaction.amount).label("total_amount")
        )
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month
        )
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )

    return results

# 4️⃣ Monthly summary (Income / Expense / Balance)
@router.get("/summary")
def monthly_summary(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Transaction)
        .join(Category)
        .filter(Transaction.user_id == current_user.id)
    )

    if month:
        try:
            year, month_num = month.split("-")
            query = query.filter(
                extract("year", Transaction.date) == int(year),
                extract("month", Transaction.date) == int(month_num),
            )
        except ValueError:
            return {"total_income": 0, "total_expense": 0}

    total_income = (
        query.filter(Category.type == "income")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )

    total_expense = (
        query.filter(Category.type == "expense")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )

    return {
        "total_income": total_income,
        "total_expense": total_expense,
    }

# 5️⃣ AI Insight Generator
@router.get("/insights", response_model=list[InsightResponse])
def generate_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insights = []

    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).all()

    for budget in budgets:
        spent = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == budget.category_id
            )
            .scalar()
            or 0
        )

        percentage = (spent / budget.monthly_limit) * 100

        if percentage >= 100:
            insights.append({
                "message": "You have exceeded your budget in a category. Consider reducing expenses."
            })
        elif percentage >= 80:
            insights.append({
                "message": "You are close to your budget limit. Monitor spending carefully."
            })

    if not insights:
        insights.append({
            "message": "Great job! Your spending is well within budget."
        })

    return insights

# 6️⃣ Auto-Savings Advisor
@router.get("/auto-savings", response_model=SavingsResponse)
def auto_savings_advisor(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import timedelta
    
    today = date.today()
    # Use provided year/month or default to current
    current_year = year or today.year
    current_month = month or today.month
    
    # Get CURRENT MONTH income and expenses only
    monthly_income = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            extract("year", Transaction.date) == current_year,
            extract("month", Transaction.date) == current_month
        )
        .scalar()
        or 0
    )

    monthly_expense = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == current_year,
            extract("month", Transaction.date) == current_month
        )
        .scalar()
        or 0
    )

    disposable = monthly_income - monthly_expense
    
    current_month_str = f"{current_year}-{current_month:02d}"

    if monthly_income <= 0:
        return {
            "savings_amount": 0,
            "savings_percent": 0,
            "level": "critical",
            "message": f"No income entered this month ({current_month_str}).",
            "monthly_income": round(monthly_income, 2),
            "monthly_expense": round(monthly_expense, 2),
            "disposable": round(disposable, 2),
            "income_months": current_month_str,
            "num_income_months": 1
        }
    
    if disposable <= 0:
        return {
            "savings_amount": 0,
            "savings_percent": 0,
            "level": "critical",
            "message": "Expenses are higher than current month income.",
            "monthly_income": round(monthly_income, 2),
            "monthly_expense": round(monthly_expense, 2),
            "disposable": round(disposable, 2),
            "income_months": current_month_str,
            "num_income_months": 1
        }

    # Cap suggestion to avoid exceeding monthly income
    suggested = min(disposable * 0.3, monthly_income * 0.3)
    suggested = round(max(0, suggested), 2)
    savings_percent = round((suggested / monthly_income) * 100, 2)

    if savings_percent >= 30:
        level = "healthy"
        message = "Strong savings level."
    elif savings_percent >= 15:
        level = "good"
        message = "Comfortable savings level."
    else:
        level = "tight"
        message = "Small savings level."

    return {
        "savings_amount": suggested,
        "savings_percent": savings_percent,
        "level": level,
        "message": message,
        "monthly_income": round(monthly_income, 2),
        "monthly_expense": round(monthly_expense, 2),
        "disposable": round(disposable, 2),
        "income_months": current_month_str,
        "num_income_months": 1
    }

# 7️⃣ Historical Comparison (Quarter over Quarter)
@router.get("/historical-comparison")
def historical_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare spending across quarters - Quarter over Quarter analysis"""
    today = date.today()
    current_quarter = (today.month - 1) // 3 + 1
    current_year = today.year
    
    quarters_data = []
    
    # Get last 4 quarters (current + 3 previous)
    for q_offset in range(4):
        if q_offset == 0:
            quarter = current_quarter
            year = current_year
        else:
            quarter = ((current_quarter - q_offset - 1) % 4) + 1
            year = current_year if (current_quarter - q_offset) > 0 else current_year - 1
        
        # Calculate months for this quarter
        start_month = (quarter - 1) * 3 + 1
        end_month = quarter * 3
        
        quarterly_expense = 0
        quarterly_income = 0
        monthly_breakdown = {}
        
        for month in range(start_month, end_month + 1):
            income = (
                db.query(func.sum(Transaction.amount))
                .join(Category)
                .filter(
                    Transaction.user_id == current_user.id,
                    Category.type == "income",
                    extract("year", Transaction.date) == year,
                    extract("month", Transaction.date) == month
                )
                .scalar() or 0
            )
            
            expense = (
                db.query(func.sum(Transaction.amount))
                .join(Category)
                .filter(
                    Transaction.user_id == current_user.id,
                    Category.type == "expense",
                    extract("year", Transaction.date) == year,
                    extract("month", Transaction.date) == month
                )
                .scalar() or 0
            )
            
            quarterly_expense += expense
            quarterly_income += income
            monthly_breakdown[f"Month {month}"] = {
                "income": round(income, 2),
                "expense": round(expense, 2)
            }
        
        save_rate = ((quarterly_income - quarterly_expense) / quarterly_income * 100) if quarterly_income > 0 else 0
        
        quarters_data.append({
            "quarter": f"Q{quarter} {year}",
            "income": round(quarterly_income, 2),
            "expense": round(quarterly_expense, 2),
            "saved": round(quarterly_income - quarterly_expense, 2),
            "save_rate": round(save_rate, 2),
            "monthly_breakdown": monthly_breakdown
        })
    
    # Calculate percentage change
    if len(quarters_data) >= 2:
        previous_quarter = quarters_data[1]["expense"]
        current = quarters_data[0]["expense"]
        change_percent = ((current - previous_quarter) / previous_quarter * 100) if previous_quarter > 0 else 0
        trend = "up" if change_percent > 0 else "down"
        
        return {
            "quarters": quarters_data,
            "comparison": {
                "previous_quarter_expense": previous_quarter,
                "current_quarter_expense": current,
                "change_percent": round(change_percent, 2),
                "trend": trend,
                "message": f"Your spending is {abs(round(change_percent, 1))}% {trend} compared to last quarter"
            }
        }
    
    return {"quarters": quarters_data, "comparison": None}


# 8️⃣ Goal vs Reality (Budget vs Actual)
@router.get("/goal-vs-reality")
def goal_vs_reality(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare budgeted amounts vs actual spending for each category"""
    from app.models.budget import Budget
    
    try:
        budgets = db.query(Budget).filter(
            Budget.user_id == current_user.id
        ).all()
        
        comparison = []
        total_budgeted = 0
        total_actual = 0
        
        for budget in budgets:
            if not budget.category:
                continue
            
            # Skip income categories - budgets are for expenses only
            if budget.category.type == "income":
                continue
                
            actual_spent = (
                db.query(func.sum(Transaction.amount))
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == budget.category_id,
                    extract("year", Transaction.date) == year,
                    extract("month", Transaction.date) == month
                )
                .scalar() or 0
            )
            
            budgeted = budget.monthly_limit
            variance_percent = ((actual_spent - budgeted) / budgeted * 100) if budgeted > 0 else 0
            status = "over" if actual_spent > budgeted else "under"
            
            comparison.append({
                "category": budget.category.name,
                "budgeted": round(budgeted, 2),
                "actual": round(actual_spent, 2),
                "variance": round(actual_spent - budgeted, 2),
                "variance_percent": round(variance_percent, 2),
                "status": status,
                "utilization_percent": round((actual_spent / budgeted * 100) if budgeted > 0 else 0, 2)
            })
            
            total_budgeted += budgeted
            total_actual += actual_spent
        
        total_variance_percent = ((total_actual - total_budgeted) / total_budgeted * 100) if total_budgeted > 0 else 0
        
        return {
            "by_category": comparison,
            "summary": {
                "total_budgeted": round(total_budgeted, 2),
                "total_actual": round(total_actual, 2),
                "total_variance": round(total_actual - total_budgeted, 2),
                "total_variance_percent": round(total_variance_percent, 2),
                "status": "over" if total_actual > total_budgeted else "under"
            }
        }
    except Exception as e:
        print(f"Goal vs Reality Error: {str(e)}")
        return {
            "by_category": [],
            "summary": {
                "total_budgeted": 0,
                "total_actual": 0,
                "total_variance": 0,
                "total_variance_percent": 0,
                "status": "under"
            }
        }


# 🔟 Recurring Transactions (Category Intelligence)
@router.get("/recurring-transactions")
def recurring_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect recurring transactions and subscriptions"""
    from sqlalchemy import and_
    from collections import Counter
    
    today = date.today()
    six_months_ago = today.replace(day=1) - timedelta(days=180)
    
    # Categories that are truly subscription/recurring in nature
    # Using case-insensitive matching and includes variations
    subscription_keywords = [
        "subscription", "bill", "utilit", "insur", 
        "entertain", "gym", "health", "stream", "internet", "phone", "netflix"
    ]
    
    # Get all transactions from last 6 months
    all_transactions = db.query(
        Transaction.description,
        Transaction.category_id,
        Transaction.amount,
        func.count(Transaction.id).label("frequency"),
        func.avg(Transaction.amount).label("avg_amount"),
        Category.name.label("category_name")
    ).join(Category).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= six_months_ago,
        Category.type == "expense"
    ).group_by(
        Transaction.description,
        Transaction.category_id,
        Transaction.amount,
        Category.name
    ).all()
    
    # Filter by subscription keywords (case-insensitive partial matching)
    transactions = [
        txn for txn in all_transactions 
        if any(keyword.lower() in txn.category_name.lower() for keyword in subscription_keywords)
    ]
    
    recurring = []
    
    for txn in transactions:
        # Consider recurring if appears 2+ times in 6 months (bi-monthly or more frequent)
        if txn.frequency >= 2:
            # All transactions in these categories are subscriptions
            is_likely_subscription = txn.frequency >= 2
            
            monthly_cost = txn.avg_amount * 12 if txn.frequency >= 2 else txn.avg_amount
            
            recurring.append({
                "description": txn.description or f"{txn.category_name}",
                "category": txn.category_name,
                "frequency": txn.frequency,
                "avg_amount": round(txn.avg_amount, 2),
                "estimated_monthly": round(monthly_cost / 12, 2),
                "estimated_yearly": round(monthly_cost, 2),
                "is_subscription": is_likely_subscription,
                "confidence": min(100, (txn.frequency / 4) * 100)  # 0-100% confidence based on frequency
            })
    
    # Sort by yearly cost
    recurring.sort(key=lambda x: x["estimated_yearly"], reverse=True)
    
    total_yearly = sum(r["estimated_yearly"] for r in recurring)
    subscriptions = [r for r in recurring if r["is_subscription"]]
    
    return {
        "recurring_transactions": recurring,
        "subscriptions": subscriptions,
        "summary": {
            "total_recurring_monthly": round(sum(r["estimated_monthly"] for r in recurring), 2),
            "total_recurring_yearly": round(total_yearly, 2),
            "subscription_count": len(subscriptions),
            "total_subscription_yearly": round(sum(s["estimated_yearly"] for s in subscriptions), 2)
        }
    }


# Income to Expense Ratio Over Time
@router.get("/income-expense-ratio")
def income_expense_ratio(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track Income-to-Expense ratio over the last N months"""
    from datetime import timedelta
    
    today = date.today()
    ratio_data = []
    
    for i in range(months):
        month_date = today - timedelta(days=30 * i)
        year = month_date.year
        month = month_date.month
        
        income = (
            db.query(func.sum(Transaction.amount))
            .join(Category)
            .filter(
                Transaction.user_id == current_user.id,
                Category.type == "income",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month
            )
            .scalar() or 1  # Avoid division by zero
        )
        
        expense = (
            db.query(func.sum(Transaction.amount))
            .join(Category)
            .filter(
                Transaction.user_id == current_user.id,
                Category.type == "expense",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month
            )
            .scalar() or 0
        )
        
        ratio = income / expense if expense > 0 else 0
        
        ratio_data.append({
            "month": f"{year}-{month:02d}",
            "income": round(income, 2),
            "expense": round(expense, 2),
            "ratio": round(ratio, 2),
            "savings_percent": round((income - expense) / income * 100 if income > 0 else 0, 2)
        })
    
    return {
        "data": list(reversed(ratio_data)),
        "average_ratio": round(sum(d["ratio"] for d in ratio_data) / len(ratio_data), 2) if ratio_data else 0
    }