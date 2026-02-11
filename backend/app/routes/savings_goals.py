from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.database import SessionLocal
from app.models.savings_goal import SavingsGoal
from app.schemas.savings_goal import (
    SavingsGoalCreate, 
    SavingsGoalUpdate, 
    SavingsGoalResponse,
    SavingsGoalAddProgress
)
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/savings-goals", tags=["Savings Goals"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def format_goal_response(goal):
    """Helper to format goal response with calculated fields"""
    progress = (goal.current_amount / goal.target_amount) * 100 if goal.target_amount > 0 else 0
    days_remaining = (goal.target_date - date.today()).days if goal.target_date else None
    
    # Check if on track (assuming linear progress)
    on_track = None
    if goal.target_date:
        total_days = (goal.target_date - goal.created_at).days
        if total_days > 0:
            days_elapsed = (date.today() - goal.created_at).days
            expected_progress = (days_elapsed / total_days) * 100
            on_track = progress >= expected_progress * 0.8  # 80% or more of expected
    
    return {
        **goal.__dict__,
        "progress_percent": round(progress, 2),
        "days_remaining": days_remaining,
        "on_track": on_track
    }


@router.post("/", response_model=SavingsGoalResponse)
def create_savings_goal(
    goal: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_goal = SavingsGoal(
        user_id=current_user.id,
        name=goal.name,
        target_amount=goal.target_amount,
        category=goal.category,
        priority=goal.priority,
        target_date=goal.target_date,
        created_at=date.today()
    )
    
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    
    return format_goal_response(new_goal)


@router.get("/", response_model=list[SavingsGoalResponse])
def get_savings_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id
    ).order_by(SavingsGoal.priority).all()
    
    return [format_goal_response(goal) for goal in goals]


@router.put("/{goal_id}", response_model=SavingsGoalResponse)
def update_savings_goal(
    goal_id: int,
    goal_update: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(goal, key, value)
    
    db.commit()
    db.refresh(goal)
    
    return format_goal_response(goal)


@router.post("/{goal_id}/add-progress", response_model=SavingsGoalResponse)
def add_goal_progress(
    goal_id: int,
    progress: SavingsGoalAddProgress,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add manual progress to a savings goal"""
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal.current_amount += progress.amount
    
    db.commit()
    db.refresh(goal)
    
    return format_goal_response(goal)


@router.delete("/{goal_id}")
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    
    return {"status": "deleted"}
