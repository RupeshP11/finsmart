from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str  # "income" or "expense"


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True
