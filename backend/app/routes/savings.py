from fastapi import APIRouter
from app.schemas.savings import SavingsRequest, SavingsResponse

router = APIRouter(prefix="/savings", tags=["Auto-Savings Advisor"])

@router.post("/advice", response_model=SavingsResponse)
def savings_advice(data: SavingsRequest):
    income = data.monthly_income
    expenses = data.monthly_expenses

    savings = income - expenses
    percent = (savings / income) * 100 if income else 0

    if savings <= 0:
        return {
            "savings_amount": 0,
            "savings_percent": 0,
            "level": "critical",
            "message": "Your expenses exceed or equal your income. Focus on expense control first."
        }

    if percent <= 10:
        level = "low"
        message = "Your savings are low. Try reducing discretionary expenses."
    elif percent <= 25:
        level = "healthy"
        message = "You are maintaining healthy savings. Keep it up!"
    else:
        level = "excellent"
        message = "Excellent savings rate! Consider investing surplus for long-term goals."

    return {
        "savings_amount": round(savings, 2),
        "savings_percent": round(percent, 2),
        "level": level,
        "message": message
    }
