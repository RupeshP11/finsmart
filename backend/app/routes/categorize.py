from fastapi import APIRouter
from pydantic import BaseModel

from app.ml.predictor import predict_category

router = APIRouter(prefix="/categorize-expense", tags=["ML"])


class ExpenseText(BaseModel):
    text: str


@router.post("/")
def categorize_expense(payload: ExpenseText):
    return predict_category(payload.text)
