from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.autosave_record import AutoSaveRecord
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/savings-analytics", tags=["Savings Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Monthly savings trend (line chart data)
@router.get("/trend")
def savings_trend(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get monthly savings trend for the last N months"""
    today = date.today()
    trend = []
    
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
            .scalar()
            or 0
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
            .scalar()
            or 0
        )
        
        saved = income - expense
        
        trend.append({
            "month": f"{year}-{month:02d}",
            "income": round(income, 2),
            "expense": round(expense, 2),
            "saved": round(saved, 2),
            "save_rate": round((saved / income * 100) if income > 0 else 0, 2)
        })
    
    return list(reversed(trend))


# Cash-flow safety score (Enhanced)
@router.get("/safety-score")
def cash_flow_safety(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate comprehensive cash-flow safety score (0-100)"""
    from app.models.savings_goal import SavingsGoal
    
    today = date.today()
    
    # Get 3-month averages
    avg_income_3m = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            Transaction.date >= today - timedelta(days=90)
        )
        .scalar()
        or 0
    ) / 3
    
    avg_expense_3m = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            Transaction.date >= today - timedelta(days=90)
        )
        .scalar()
        or 0
    ) / 3
    
    monthly_savings = avg_income_3m - avg_expense_3m
    buffer_months = monthly_savings / avg_expense_3m if avg_expense_3m > 0 else 0
    buffer_months = max(0, buffer_months)
    
    # Check emergency fund goal (category or name match)
    all_goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id
    ).all()
    
    emergency_goals = [
        g for g in all_goals
        if g.category == "emergency" or "emergency" in g.name.lower()
    ]
    
    emergency_ratio = 0
    if emergency_goals:
        total_emergency = sum(g.current_amount for g in emergency_goals)
        target_total = sum(g.target_amount for g in emergency_goals if g.target_amount > 0)
        recommended_total = avg_expense_3m * 3  # 3 months of expenses
        needed_emergency = target_total if target_total > 0 else recommended_total
        if needed_emergency > 0:
            emergency_ratio = (total_emergency / needed_emergency) * 100
        else:
            emergency_ratio = 100
    
    # Income volatility (std dev)
    recent_income = (
        db.query(Transaction.amount)
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            Transaction.date >= today - timedelta(days=30)
        )
        .all()
    )
    
    income_volatility = 0  # Lower is better
    if len(recent_income) > 1:
        import statistics
        amounts = [t.amount for t in recent_income]
        if amounts:
            volatility_score = statistics.stdev(amounts) / (sum(amounts) / len(amounts)) if sum(amounts) > 0 else 0
            income_volatility = min(50, volatility_score * 100)  # Cap at 50 points
    
    # Calculate composite score
    buffer_score = min(40, max(0, (buffer_months / 6) * 40))  # 40% weight
    emergency_score = min(40, max(0, emergency_ratio * 0.4))  # 40% weight
    stability_score = min(20, max(0, (20 - income_volatility)))  # 20% weight

    safety_score = min(100, max(0, buffer_score + emergency_score + stability_score))
    
    level = "critical" if safety_score < 30 else "warning" if safety_score < 60 else "healthy"
    
    return {
        "score": round(safety_score, 0),
        "level": level,
        "buffer_months": round(buffer_months, 1),
        "emergency_fund_ratio": round(min(emergency_ratio, 100), 0),
        "income_stability": round(max(0, min(100, 100 - income_volatility)), 0),
        "avg_monthly_savings": round(monthly_savings, 2),
        "monthly_expense": round(avg_expense_3m, 2),
        "recommended_emergency_fund": round(avg_expense_3m * 3, 2)
    }


# Savings consistency (Enhanced)
@router.get("/consistency")
def savings_consistency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track consistency of monthly savings with detailed insights"""
    today = date.today()
    months_with_savings = 0
    total_months = 6
    consecutive_months = 0
    max_consecutive = 0
    monthly_details = []
    
    for i in range(6):
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
            .scalar()
            or 0
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
            .scalar()
            or 0
        )
        
        saved = income - expense
        
        monthly_details.append({
            "month": f"{year}-{month:02d}",
            "saved": round(saved, 2),
            "status": "positive" if saved > 0 else "negative"
        })
        
        if saved > 0:
            months_with_savings += 1
            consecutive_months += 1
            max_consecutive = max(max_consecutive, consecutive_months)
        else:
            consecutive_months = 0
    
    consistency_rate = (months_with_savings / total_months * 100) if total_months > 0 else 0
    
    # Determine achievement level
    if consistency_rate == 100:
        achievement = "Perfect! Saved all 6 months"
    elif consistency_rate >= 80:
        achievement = "Excellent consistency"
    elif consistency_rate >= 60:
        achievement = "Good savings habit"
    else:
        achievement = "Keep improving"
    
    # Milestone badges based on consecutive months
    badges = []
    if consecutive_months >= 12:
        badges.append({"name": "Master Saver", "icon": "master", "color": "#9333ea"})
    if consecutive_months >= 6:
        badges.append({"name": "Savings Champion", "icon": "champion", "color": "#0891b2"})
    if consecutive_months >= 3:
        badges.append({"name": "Consistent Saver", "icon": "consistent", "color": "#16a34a"})
    
    # Adaptive message based on streak
    if consecutive_months >= 6:
        adaptive_message = f"Outstanding! {consecutive_months} month streak. Challenge: Increase your save rate by 5%"
        next_goal = "increase_rate"
    elif consecutive_months >= 3:
        adaptive_message = f"Great job! {consecutive_months} consecutive months. Keep going to reach 6 months!"
        next_goal = "reach_6_months"
    elif consecutive_months >= 1:
        adaptive_message = "Good start! Save next month to build your streak."
        next_goal = "build_streak"
    else:
        adaptive_message = "Start your savings journey today. Aim for 1 month first."
        next_goal = "start_saving"
    
    # Progressive challenge
    challenge = None
    if consecutive_months >= 6:
        # Get average save rate over last 3 months
        recent_months = monthly_details[:3]
        total_saved = sum(m.get("saved", 0) for m in recent_months)
        # Calculate from backend if possible, otherwise suggest generic
        challenge = {
            "title": "Level Up Your Savings",
            "description": "You're consistent! Try saving 5-10% more this month.",
            "type": "increase_rate",
            "target_increase": 5
        }
    elif consecutive_months >= 3:
        challenge = {
            "title": "Reach 6 Month Milestone",
            "description": f"You're at {consecutive_months} months. Keep the streak alive!",
            "type": "maintain_streak",
            "months_to_goal": 6 - consecutive_months
        }
    
    return {
        "consistency_rate": round(consistency_rate, 0),
        "months_with_savings": months_with_savings,
        "total_months_tracked": total_months,
        "consecutive_positive_months": consecutive_months,
        "max_consecutive": max_consecutive,
        "achievement": achievement,
        "monthly_breakdown": list(reversed(monthly_details)),
        "badges": badges,
        "adaptive_message": adaptive_message,
        "next_goal": next_goal,
        "challenge": challenge
    }


# AutoSave records history
@router.get("/records")
def autosave_records(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get autosave transaction records"""
    records = db.query(AutoSaveRecord).filter(
        AutoSaveRecord.user_id == current_user.id
    ).order_by(AutoSaveRecord.date.desc()).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "amount": r.amount,
            "date": r.date,
            "rule_type": r.rule_type,
            "status": r.status
        }
        for r in records
    ]


# Recommendations based on data
@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top 3 personalized savings recommendations"""
    from app.models.savings_goal import SavingsGoal
    
    today = date.today()
    recommendations = []
    
    # Get monthly averages
    avg_expense_3m = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "expense",
            Transaction.date >= today - timedelta(days=90)
        )
        .scalar()
        or 0
    ) / 3
    
    avg_income_3m = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Category.type == "income",
            Transaction.date >= today - timedelta(days=90)
        )
        .scalar()
        or 0
    ) / 3
    
    # 1️⃣ EMERGENCY FUND (Main card 1)
    all_goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id
    ).all()
    
    emergency_goals = [
        g for g in all_goals
        if g.category == "emergency" or "emergency" in g.name.lower()
    ]
    
    total_emergency = sum(g.current_amount for g in emergency_goals) if emergency_goals else 0
    target_total = sum(g.target_amount for g in emergency_goals if g.target_amount > 0)
    recommended_total = avg_expense_3m * 3
    needed_emergency = target_total if target_total > 0 else recommended_total
    emergency_goal_complete = any(
        (g.current_amount / g.target_amount * 100) >= 100 if g.target_amount > 0 else False
        for g in emergency_goals
    )
    emergency_complete = emergency_goal_complete or (needed_emergency > 0 and total_emergency >= needed_emergency)
    
    if not emergency_complete and needed_emergency > 0:
        recommendations.append({
            "priority": "high",
            "title": "Emergency Fund",
            "description": f"₹{max(0, needed_emergency - total_emergency):.0f} needed for 3-month cushion",
            "action": "Save for emergencies"
        })
    
    # 2️⃣ SAVINGS RATE (Main card 2)
    if avg_income_3m > 0:
        save_rate = ((avg_income_3m - avg_expense_3m) / avg_income_3m * 100)
        
        if save_rate < 10 and len(recommendations) < 3:
            recommendations.append({
                "priority": "high",
                "title": "Increase Savings",
                "description": f"Currently saving {save_rate:.0f}% - Aim for 20-30% monthly",
                "action": "Cut unnecessary expenses"
            })
        elif save_rate > 30 and len(recommendations) < 3:
            recommendations.append({
                "priority": "medium",
                "title": "Invest Surplus",
                "description": f"You're saving {save_rate:.0f}% - Great for investing",
                "action": "Explore SIP investments"
            })
    
    # 3️⃣ ACTIVE GOALS (Main card 3)
    pending_goals = []
    for goal in all_goals:
        if goal.target_date:
            days_left = (goal.target_date - today).days
            progress = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
            # Skip completed or near-complete goals
            if progress < 90 and days_left > 0:
                monthly_needed = (goal.target_amount - goal.current_amount) / max(days_left / 30, 1)
                pending_goals.append({
                    "name": goal.name,
                    "monthly": monthly_needed,
                    "days": days_left
                })
    
    if pending_goals and len(recommendations) < 3:
        pending_goals.sort(key=lambda g: g["monthly"], reverse=True)
        top_goal = pending_goals[0]
        recommendations.append({
            "priority": "medium",
            "title": f"Boost {top_goal['name']}",
            "description": f"Save ₹{top_goal['monthly']:.0f}/month to finish in {top_goal['days'] // 30} months",
            "action": "Allocate funds to goal"
        })
    
    # Return only top 3 recommendations
    return recommendations[:3]
