from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import SessionLocal
from app.models.alert import Alert
from app.core.dependencies import get_current_user
from app.models.user import User
from fastapi import HTTPException


router = APIRouter(prefix="/alerts", tags=["Alerts"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_alerts(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if month:
       try:
           year, month_num = map(int, month.split("-"))
       except ValueError:
           raise HTTPException(
               status_code=400,
               detail="Month must be in YYYY-MM format"
            )
    else:
        today = date.today()
        year, month_num = today.year, today.month


    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.year == year,
        Alert.month == month_num
    ).all()

    return alerts
