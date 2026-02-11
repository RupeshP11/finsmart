from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from collections import Counter

from app.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.budget import Budget

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.get("/enhanced")
def get_enhanced_insights(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enhanced insights with:
    1. Smart Spending Patterns - Top 3 data-driven insights
    2. Savings Opportunities - Unused subscriptions, budget overruns, savings
    """
    
    # Resolve selected month
    if month:
        try:
            year, month_num = month.split("-")
            year = int(year)
            month_num = int(month_num)
        except ValueError:
            return {"error": "Invalid month format. Use YYYY-MM."}
    else:
        today = date.today()
        year = today.year
        month_num = today.month

    # ========== 1. SMART SPENDING PATTERNS ==========
    spending_patterns = []
    
    # Get total expenses for this month
    total_expense = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month_num,
        )
        .scalar()
        or 0
    )

    if total_expense > 0:
        # Top 3 expense categories
        top_categories = (
            db.query(
                Category.name,
                func.sum(Transaction.amount).label("amount"),
            )
            .join(Transaction)
            .filter(
                Transaction.user_id == current_user.id,
                Category.type == "expense",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month_num,
            )
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        # Insight 1: Top spending category
        if top_categories:
            top_cat = top_categories[0]
            percent = (top_cat[1] / total_expense) * 100
            spending_patterns.append({
                "title": "Highest Spending Category",
                "icon": "📊",
                "description": f"Your biggest expense is {top_cat[0]} at ₹{round(top_cat[1], 2)} ({percent:.1f}% of total spending)",
                "metric": f"₹{round(top_cat[1], 2)}",
                "category": top_cat[0],
                "type": "top_category"
            })

        # Insight 2: Trending category (compare with previous month)
        prev_month_num = month_num - 1 if month_num > 1 else 12
        prev_year = year if month_num > 1 else year - 1
        
        prev_month_expense = (
            db.query(func.sum(Transaction.amount))
            .join(Category)
            .filter(
                Transaction.user_id == current_user.id,
                Category.type == "expense",
                extract("year", Transaction.date) == prev_year,
                extract("month", Transaction.date) == prev_month_num,
            )
            .scalar()
            or 0
        )

        if prev_month_expense > 0:
            change_percent = ((total_expense - prev_month_expense) / prev_month_expense) * 100
            trend_icon = "📈" if change_percent > 0 else "📉"
            trend_text = f"increased by {change_percent:.1f}%" if change_percent > 0 else f"decreased by {abs(change_percent):.1f}%"
            
            spending_patterns.append({
                "title": "Monthly Spending Trend",
                "icon": trend_icon,
                "description": f"Your expenses have {trend_text} compared to last month",
                "metric": f"{trend_text}",
                "change_percent": change_percent,
                "type": "trend"
            })
        else:
            spending_patterns.append({
                "title": "Monthly Spending Trend",
                "icon": "📊",
                "description": f"This is your first month of tracking",
                "metric": f"₹{round(total_expense, 2)}",
                "type": "trend"
            })

        # Insight 3: Spending velocity (transactions per day)
        transactions_count = (
            db.query(func.count(Transaction.id))
            .join(Category)
            .filter(
                Transaction.user_id == current_user.id,
                Category.type == "expense",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month_num,
            )
            .scalar()
            or 0
        )

        spending_patterns.append({
            "title": "Spending Activity",
            "icon": "💳",
            "description": f"You made {transactions_count} expense transactions this month",
            "metric": f"{transactions_count} transactions",
            "transaction_count": transactions_count,
            "type": "activity"
        })
    else:
        spending_patterns.append({
            "title": "No Spending Data",
            "icon": "📭",
            "description": "No expenses recorded for this month yet",
            "metric": "₹0",
            "type": "empty"
        })

    # ========== 2. SAVINGS OPPORTUNITIES ==========
    savings_ops = []
    
    # A. Detect unused/low-frequency subscriptions
    today = date.today()
    six_months_ago = today.replace(day=1) - timedelta(days=180)
    
    subscription_keywords = [
        "subscription", "bill", "utilit", "insur", 
        "entertain", "gym", "health", "stream", "internet", "phone", "netflix"
    ]
    
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
    
    subscriptions = []
    for txn in all_transactions:
        if any(keyword.lower() in txn.category_name.lower() for keyword in subscription_keywords):
            if txn.frequency >= 2:
                subscriptions.append({
                    "description": txn.description or txn.category_name,
                    "category": txn.category_name,
                    "frequency": txn.frequency,
                    "avg_amount": round(txn.avg_amount, 2),
                    "estimated_yearly": round((txn.avg_amount * 12), 2)
                })
    
    subscriptions.sort(key=lambda x: x["estimated_yearly"], reverse=True)
    
    # Most expensive subscription
    if subscriptions:
        most_expensive = subscriptions[0]
        savings_ops.append({
            "title": "Most Expensive Subscription",
            "icon": "📺",
            "description": f"Your most costly recurring expense is {most_expensive['description']} at ₹{most_expensive['avg_amount']}/month",
            "metric": f"₹{most_expensive['estimated_yearly']}/year",
            "amount": most_expensive['avg_amount'],
            "type": "subscription"
        })
        
        # If there are unused ones
        unused_count = sum(1 for s in subscriptions if s['frequency'] <= 4)
        if unused_count > 0:
            unused_total = sum(s['estimated_yearly'] for s in subscriptions if s['frequency'] <= 4)
            savings_ops.append({
                "title": "Infrequent Subscriptions",
                "icon": "⚠️",
                "description": f"You have {unused_count} subscription(s) with low usage frequency",
                "metric": f"Potential savings: ₹{round(unused_total, 2)}/year",
                "potential_savings": unused_total,
                "type": "unused_subs"
            })

    # B. Budget overruns
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).all()
    
    budget_overruns = []
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
                extract("month", Transaction.date) == month_num
            )
            .scalar() or 0
        )
        
        if actual_spent > budget.monthly_limit:
            overrun_amount = actual_spent - budget.monthly_limit
            budget_overruns.append({
                "category": budget.category.name,
                "budgeted": budget.monthly_limit,
                "actual": actual_spent,
                "overrun": round(overrun_amount, 2)
            })
    
    if budget_overruns:
        total_overrun = sum(b['overrun'] for b in budget_overruns)
        savings_ops.append({
            "title": "Budget Overruns",
            "icon": "🚨",
            "description": f"You've overspent in {len(budget_overruns)} budget category(ies)",
            "metric": f"Total overspend: ₹{round(total_overrun, 2)}",
            "potential_savings": total_overrun,
            "categories": budget_overruns,
            "type": "budget_overrun"
        })

    # C. Potential monthly savings
    monthly_income = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month_num
        )
        .scalar()
        or 0
    )

    if monthly_income > 0:
        disposable = monthly_income - total_expense
        savings_potential = disposable * 0.3  # 30% of disposable
        
        savings_ops.append({
            "title": "Potential Monthly Savings",
            "icon": "💰",
            "description": f"Based on current spending, you could save up to ₹{round(savings_potential, 2)}/month",
            "metric": f"₹{round(savings_potential, 2)}/month",
            "annual_potential": round(savings_potential * 12, 2),
            "type": "savings_potential"
        })

    return {
        "month": f"{year}-{month_num:02d}",
        "spending_patterns": spending_patterns,
        "savings_opportunities": savings_ops,
        "summary": {
            "total_expense": round(total_expense, 2),
            "total_income": round(monthly_income, 2),
            "subscription_count": len(subscriptions),
            "budget_overruns": len(budget_overruns)
        }
    }


@router.get("/monthly")
def get_monthly_insights(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    insights = []

    # Resolve selected month
    if month:
        try:
            year, month_num = month.split("-")
            year = int(year)
            month_num = int(month_num)
        except ValueError:
            return {"insights": ["Invalid month format. Use YYYY-MM."]}
    else:
        today = date.today()
        year = today.year
        month_num = today.month

    # Total expense for selected month
    total_expense = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month_num,
        )
        .scalar()
        or 0
    )

    if total_expense == 0:
        return {
            "insights": [
                "No expenses recorded for this month yet."
            ]
        }

    # Expense distribution by category (same month)
    category_expenses = (
        db.query(
            Category.name,
            func.sum(Transaction.amount).label("amount"),
        )
        .join(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month_num,
        )
        .group_by(Category.name)
        .all()
    )

    # Insight 1: Spending spread
    if len(category_expenses) <= 2:
        insights.append(
            "Your spending is concentrated in a few categories, which makes budgeting easier."
        )
    else:
        insights.append(
            "Your expenses are spread across multiple categories. Reviewing recurring costs may help optimize spending."
        )

    # Insight 2: Total spend
    insights.append(
        f"Your total recorded expenses for this month are ₹{round(abs(total_expense), 2)}."
    )

    # Safety fallback
    if not insights:
        insights.append(
            "Your financial data is being tracked correctly. More insights will appear as activity increases."
        )

    return {"insights": insights}
