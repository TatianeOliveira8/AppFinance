from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TransactionTypeEnum(str, Enum):
    income = "income"
    expense = "expense"

# ========== USER SCHEMAS ==========

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    class Config: from_attributes = True

class TokenResponse(BaseModel): # <--- DEVOLVENDO O QUE FALTAVA
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str

# ========== CATEGORY SCHEMAS ==========

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: Optional[TransactionTypeEnum] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    type: Optional[TransactionTypeEnum] = None
    user_id: Optional[int] = None
    class Config: from_attributes = True

# ========== TRANSACTION SCHEMAS ==========

class TransactionCreate(BaseModel):
    type: TransactionTypeEnum
    value: float = Field(..., gt=0)
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    is_paid: Optional[bool] = True
    is_fixed: Optional[bool] = False
    day_of_month: Optional[int] = None

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    type: TransactionTypeEnum
    value: float
    description: Optional[str]
    category_id: Optional[int]
    category: Optional[CategoryResponse] = None # Incluindo os dados da categoria (ícone!)
    date: datetime
    is_paid: bool
    is_fixed: bool
    day_of_month: Optional[int]
    class Config: from_attributes = True

class TransactionSummary(BaseModel):
    balance: float
    total_income: float
    total_expense: float
    pending_income: float
    pending_expense: float
    by_category: List[dict]
    by_category_income: List[dict]
