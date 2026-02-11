from pydantic import BaseModel, Field

class SavingsRequest(BaseModel):
    monthly_income: float = Field(..., gt=0)
    monthly_expenses: float = Field(..., ge=0)

class SavingsResponse(BaseModel):
    savings_amount: float
    savings_percent: float
    level: str
    message: str
    monthly_income: float
    monthly_expense: float
    disposable: float
    income_months: str = ""  # Show which months used
    num_income_months: int = 0
