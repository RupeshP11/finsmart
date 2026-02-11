from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import get_current_user
from app.database import SessionLocal
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

# Schemas
class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    subscription_plan: str
    subscription_expiry: Optional[str]

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email
    }

@router.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name or "User",
        "phone": current_user.phone or "Not provided",
        "subscription_plan": current_user.subscription_plan or "Free",
        "subscription_expiry": current_user.subscription_expiry.isoformat() if current_user.subscription_expiry else "Lifetime"
    }

@router.put("/profile")
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    
    if payload.full_name:
        user.full_name = payload.full_name
    if payload.phone:
        user.phone = payload.phone
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "subscription_plan": user.subscription_plan,
        }
    }
