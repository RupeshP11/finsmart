from pydantic import BaseModel
from datetime import date


class AutoSaveRecordCreate(BaseModel):
    amount: float
    rule_type: str
    goal_id: int | None = None


class AutoSaveRecordResponse(BaseModel):
    id: int
    amount: float
    date: date
    rule_type: str
    status: str

    class Config:
        from_attributes = True
