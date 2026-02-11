from pydantic import BaseModel, Field
from typing import Literal, Optional

class InvestmentRequest(BaseModel):
    risk_profile: Literal["low", "medium", "high"]
    month: Optional[int] = None
    year: Optional[int] = None

class InvestmentAllocation(BaseModel):
    equity: int
    debt: int
    gold: int
    emergency: int

class InvestmentResponse(BaseModel):
    allocation: InvestmentAllocation
    message: str
    investable_amount: float
    monthly_income: float
    monthly_expenses: float
