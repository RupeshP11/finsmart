from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    category = Column(String, nullable=False)  # "emergency", "vacation", "investment", etc.
    priority = Column(Integer, default=1)  # 1-high, 2-medium, 3-low
    
    created_at = Column(Date, nullable=False)
    target_date = Column(Date, nullable=True)
    
    user = relationship("User")
