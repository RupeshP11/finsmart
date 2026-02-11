from sqlalchemy import Column, Integer, Float, Date, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class AutoSaveRecord(Base):
    __tablename__ = "autosave_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    rule_type = Column(String, nullable=False)  # "percentage", "roundup", "fixed", "income_percent"
    goal_id = Column(Integer, ForeignKey("savings_goals.id"), nullable=True)
    
    status = Column(String, default="success")  # "success", "failed", "pending"
    
    user = relationship("User")
    goal = relationship("SavingsGoal")
