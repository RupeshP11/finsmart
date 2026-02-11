from pydantic import BaseModel

class BudgetCreate(BaseModel):
    category_id: int
    monthly_limit: float

class BudgetResponse(BaseModel):
    id: int
    category_id: int
    monthly_limit: float

    class Config:
        from_attributes = True
