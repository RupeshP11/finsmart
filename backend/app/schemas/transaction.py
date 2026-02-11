from pydantic import BaseModel
from datetime import date


class TransactionCreate(BaseModel):
    amount: float
    description: str | None = None
    date: date
    category_id: int


class TransactionResponse(BaseModel):
    id: int
    amount: float
    description: str | None
    date: date
    category_id: int
    category_name: str
    category_type: str

    class Config:
        from_attributes = True
