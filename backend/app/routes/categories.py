from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/categories", tags=["Categories"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if category.type not in ["income", "expense"]:
        raise HTTPException(
            status_code=400,
            detail="Category type must be 'income' or 'expense'"
        )

    new_category = Category(
        name=category.name,
        type=category.type,
        user_id=current_user.id
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@router.get("/", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(Category).filter(
        Category.user_id == current_user.id
    ).all()

    return categories
