from pydantic import BaseModel


class MonthlySummaryResponse(BaseModel):
    year: int
    month: int
    total_income: float
    total_expense: float
    savings: float
