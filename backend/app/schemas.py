from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ========== ENUMS ==========

class PaymentMethodEnum(str, Enum):
    dinheiro = "dinheiro"
    credito = "credito"
    debito = "debito"

class TransactionTypeEnum(str, Enum):
    income = "income"
    expense = "expense"

# ========== FINANCIAL PROFILE SCHEMAS ==========

class FinancialProfileBase(BaseModel):
    monthly_income: float
    bill_due_date: str
    financial_goals: Optional[str] = None

class FinancialProfileCreate(FinancialProfileBase):
    pass

class FinancialProfileResponse(FinancialProfileBase):
    id: int
    user_id: int
    class Config: from_attributes = True

# ========== USER SCHEMAS ==========

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    financial_profile: Optional['FinancialProfileResponse'] = None
    class Config: from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[int] = None
    email: Optional[str] = None
    full_name: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# ========== CATEGORY SCHEMAS ==========

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: Optional[TransactionTypeEnum] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    budget_limit: Optional[float] = Field(None, ge=0)

class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    type: Optional[TransactionTypeEnum] = None
    user_id: Optional[int] = None
    is_default: bool = False
    budget_limit: Optional[float] = None
    spent: Optional[float] = 0.0
    class Config: from_attributes = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[TransactionTypeEnum] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    budget_limit: Optional[float] = Field(None, ge=0)

# ========== ACCOUNT SCHEMAS (US-12) ==========

class AccountBase(BaseModel):
    name: str
    type: str # Ex: Corrente, Poupança, Dinheiro
    initial_balance: float = Field(0.0)

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    user_id: int
    current_balance: Optional[float] = 0.0
    class Config: from_attributes = True

class AccountTransferRequest(BaseModel):
    from_account_id: int = Field(..., gt=0)
    to_account_id: int = Field(..., gt=0)
    value: float = Field(..., gt=0)
    description: Optional[str] = None

class AccountTransferResponse(BaseModel):
    success: bool
    message: str
    from_account: AccountResponse
    to_account: AccountResponse
    transfer_amount: float
    class Config: from_attributes = True

# ========== CREDIT CARD SCHEMAS (US-11) ==========

class CreditCardBase(BaseModel):
    name: str
    limit: float = Field(..., ge=0)
    closing_day: int = Field(..., ge=1, le=31)
    due_day: int = Field(..., ge=1, le=31)

class CreditCardCreate(CreditCardBase):
    pass

class CreditCardResponse(CreditCardBase):
    id: int
    user_id: int
    available_limit: float
    class Config: from_attributes = True

# ========== TRANSACTION SCHEMAS ==========

class TransactionCreate(BaseModel):
    category_id: Optional[int] = None
    credit_card_id: Optional[int] = None
    account_id: Optional[int] = None # US-12
    type: TransactionTypeEnum
    value: float = Field(..., gt=0)
    description: Optional[str] = None
    date: Optional[datetime] = None
    is_paid: bool = True
    is_fixed: bool = False
    day_of_month: Optional[int] = None
    payment_method: Optional[PaymentMethodEnum] = None
    
    # Parcelamento (US-11)
    installments_total: Optional[int] = Field(1, ge=1)
    
    # GPS (US-GPS)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None

    # US-28
    contact_name: Optional[str] = None
    tag_ids: Optional[List[int]] = None

class TagResponse(BaseModel):
    id: int
    name: str
    user_id: int
    color: Optional[str] = None
    class Config: from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    category_id: Optional[int] = None
    credit_card_id: Optional[int] = None
    account_id: Optional[int] = None
    type: TransactionTypeEnum
    value: float
    description: Optional[str] = None
    date: datetime
    is_paid: bool
    is_fixed: bool
    day_of_month: Optional[int] = None
    payment_method: Optional[PaymentMethodEnum] = None
    receipt_photo: Optional[str] = None
    
    installments_total: int
    installment_number: int
    installment_group: Optional[str] = None
    
    # GPS (US-GPS)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    
    # US-28
    contact_name: Optional[str] = None
    tags: Optional[List[TagResponse]] = []

    category: Optional[CategoryResponse] = None
    credit_card: Optional[CreditCardResponse] = None
    account: Optional[AccountResponse] = None
    class Config: from_attributes = True

class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    credit_card_id: Optional[int] = None
    account_id: Optional[int] = None
    value: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    is_paid: Optional[bool] = None
    is_fixed: Optional[bool] = None
    payment_method: Optional[PaymentMethodEnum] = None
    contact_name: Optional[str] = None
    tag_ids: Optional[List[int]] = None

class TransactionSummary(BaseModel):
    total_balance: float
    total_income: float
    total_expense: float
    pending_income: float
    pending_expense: float
    income_pending_list: List[TransactionResponse]
    expense_pending_list: List[TransactionResponse]
    by_category: List[dict]
    by_category_income: List[dict]
    balance_evolution: List[dict]
    daily_evolution: Optional[List[dict]] = []
    anomaly_alerts: Optional[List[str]] = []
    accounts_summary: Optional[List[AccountResponse]] = None


# ========== SAVINGS GOALS SCHEMAS (US-10) ==========

class SavingsGoalBase(BaseModel):
    name: str
    target_value: float = Field(..., gt=0)
    deadline: datetime
    description: Optional[str] = None
    current_progress: Optional[float] = Field(0.0, ge=0)

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_value: Optional[float] = Field(None, gt=0)
    deadline: Optional[datetime] = None
    description: Optional[str] = None
    current_progress: Optional[float] = Field(None, ge=0)

class SavingsGoalResponse(SavingsGoalBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config: from_attributes = True
    
    @property
    def monthly_target(self) -> float:
        """Quanto precisa economizar por mês"""
        from datetime import datetime as dt, timezone
        deadline = self.deadline
        if deadline.tzinfo is not None:
            deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)
            
        months_remaining = max(1, (deadline - dt.utcnow()).days // 30)
        return self.target_value / months_remaining if months_remaining > 0 else self.target_value
    
    @property
    def progress_percentage(self) -> float:
        """Percentual de progresso (0-100)"""
        if self.target_value <= 0:
            return 0.0
        return min(100.0, (self.current_progress / self.target_value) * 100)


# ========== SPRINT 3 SCHEMAS ==========

# US-27: Tags
class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = "#607D8B"

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

# US-21: Investments
class InvestmentBase(BaseModel):
    name: str
    type: str
    invested_value: float = Field(..., ge=0)
    current_value: float = Field(..., ge=0)
    annual_rate: Optional[float] = None
    start_date: datetime
    maturity_date: Optional[datetime] = None
    institution: Optional[str] = None
    notes: Optional[str] = None

class InvestmentCreate(InvestmentBase):
    account_id: Optional[int] = None

class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    invested_value: Optional[float] = None
    current_value: Optional[float] = None
    annual_rate: Optional[float] = None
    start_date: Optional[datetime] = None
    maturity_date: Optional[datetime] = None
    institution: Optional[str] = None
    notes: Optional[str] = None

class InvestmentResponse(InvestmentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

# US-22: Annual Expenses
class AnnualExpenseBase(BaseModel):
    name: str
    estimated_value: float = Field(..., gt=0)
    due_date: datetime
    is_paid: bool = False
    notes: Optional[str] = None
    alert_days_before: int = 30

class AnnualExpenseCreate(AnnualExpenseBase):
    pass

class AnnualExpenseUpdate(BaseModel):
    name: Optional[str] = None
    estimated_value: Optional[float] = None
    due_date: Optional[datetime] = None
    is_paid: Optional[bool] = None
    notes: Optional[str] = None
    alert_days_before: Optional[int] = None

class AnnualExpenseResponse(AnnualExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    class Config: from_attributes = True

# US-20: Expense Groups
class GroupMemberBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None

class GroupMemberCreate(GroupMemberBase):
    pass

class GroupMemberResponse(GroupMemberBase):
    id: int
    group_id: int
    class Config: from_attributes = True

class GroupExpenseBase(BaseModel):
    description: str
    value: float = Field(..., gt=0)
    paid_by_id: int
    date: Optional[datetime] = None

class GroupExpenseCreate(GroupExpenseBase):
    pass

class GroupExpenseResponse(GroupExpenseBase):
    id: int
    group_id: int
    is_settled: bool
    paid_by: Optional[GroupMemberResponse] = None
    class Config: from_attributes = True

class ExpenseGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExpenseGroupCreate(ExpenseGroupBase):
    members: List[GroupMemberCreate] = []

class ExpenseGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ExpenseGroupResponse(ExpenseGroupBase):
    id: int
    created_by: int
    created_at: datetime
    members: List[GroupMemberResponse] = []
    expenses: List[GroupExpenseResponse] = []
    class Config: from_attributes = True

# US-25: Net Worth
class AccountDetail(BaseModel):
    id: int
    name: str
    type: str
    balance: float

class NetWorthResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    investments_total: float
    accounts_total: float
    credit_cards_debt: float
    loans_total: float
    accounts_detail: List[AccountDetail]

# US-26: Balance Projection
class ProjectionItem(BaseModel):
    month: str
    projected_income: float
    projected_expense: float
    projected_balance: float

class BalanceProjectionResponse(BaseModel):
    current_balance: float
    projection: List[ProjectionItem]