from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == transaction.category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    new_transaction = Transaction(
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id,
        user_id=current_user.id
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # Explicit response mapping to satisfy TransactionResponse
    return {
        "id": new_transaction.id,
        "amount": new_transaction.amount,
        "description": new_transaction.description,
        "date": new_transaction.date,
        "category_id": category.id,
        "category_name": category.name,
        "category_type": category.type
    }

@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Transaction.id,
            Transaction.amount,
            Transaction.description,
            Transaction.date,
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.type.label("category_type"),
        )
        .join(Category)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
        .all()
    )

    return results

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()

    return {"status": "deleted"}
