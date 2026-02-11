from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, nullable=False)

    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    level = Column(String, nullable=False)  # warning | danger
    message = Column(String, nullable=False)
