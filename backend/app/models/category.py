from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False)  # "income" or "expense"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationship (not required now, but useful later)
    user = relationship("User")
