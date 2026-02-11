from pydantic import BaseModel
from datetime import date


class ExpenseByCategoryResponse(BaseModel):
    category: str
    total_amount: float


class DailyExpenseResponse(BaseModel):
    date: date
    total_amount: float
