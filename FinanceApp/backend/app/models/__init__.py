from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    icon = Column(String, nullable=True) 
    color = Column(String, nullable=True) # Campo para cor personalizada
    type = Column(Enum(TransactionType), nullable=True) # Novo campo: income ou expense
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    type = Column(Enum(TransactionType))
    value = Column(Float)
    description = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    is_paid = Column(Boolean, default=True)
    is_fixed = Column(Boolean, default=False)
    day_of_month = Column(Integer, nullable=True)
    
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
