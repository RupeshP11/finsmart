from pydantic import BaseModel, Field
from datetime import date


class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float = Field(..., gt=0)
    category: str
    priority: int = Field(default=1, ge=1, le=3)
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    priority: int | None = None
    target_date: date | None = None


class SavingsGoalAddProgress(BaseModel):
    amount: float = Field(..., ge=0)
    description: str | None = None


class SavingsGoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    category: str
    priority: int
    created_at: date
    target_date: date | None
    progress_percent: float
    days_remaining: int | None = None
    on_track: bool | None = None

    class Config:
        from_attributes = True
