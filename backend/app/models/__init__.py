from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Table, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class PaymentMethod(str, enum.Enum):
    dinheiro = "dinheiro"
    credito = "credito"
    debito = "debito"

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"

# Tabela associativa para tags (US-27)
transaction_tags = Table(
    'transaction_tags', Base.metadata,
    Column('transaction_id', Integer, ForeignKey('transactions.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    financial_profile = relationship("FinancialProfile", back_populates="user", uselist=False)

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # Ex: Corrente, Poupança, Dinheiro
    initial_balance = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User")
    transactions = relationship("Transaction", back_populates="account")
    
    def calculate_balance(self, reference_date=None):
        """Calcula o saldo atual da conta baseado nas transações e data de vencimento"""
        if reference_date is None:
            reference_date = datetime.utcnow()
        
        # Normalizar data para comparação
        ref_date = reference_date.replace(tzinfo=None)
        current_day = ref_date.day
        
        balance = self.initial_balance
        for t in self.transactions:
            # Lógica de "Efetivamente Pago/Recebido"
            is_effectively_paid = False
            t_date = t.date.replace(tzinfo=None) if hasattr(t.date, 'tzinfo') else t.date
            
            if t.is_paid:
                is_effectively_paid = True
            elif t.is_fixed and t.day_of_month:
                # Se é fixo e estamos no mês dele, verifica o dia
                if t_date.month == ref_date.month and t_date.year == ref_date.year:
                    is_effectively_paid = t.day_of_month <= current_day
                # Se é de um mês passado, assume pago
                elif t_date < ref_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0):
                    is_effectively_paid = True
            else:
                # Transação normal: data passou ou é hoje = automático
                is_effectively_paid = t_date.date() <= ref_date.date()
            
            if is_effectively_paid:
                if t.type == TransactionType.income:
                    balance += t.value
                else:
                    balance -= t.value
        return balance

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    icon = Column(String, nullable=True) 
    color = Column(String, nullable=True) # Campo para cor personalizada
    type = Column(Enum(TransactionType), nullable=True) # Novo campo: income ou expense
    is_default = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    budget_limit = Column(Float, nullable=True) # Novo campo para US-09
    
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class CreditCard(Base):
    __tablename__ = "credit_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    limit = Column(Float)
    closing_day = Column(Integer) # Dia do fechamento da fatura
    due_day = Column(Integer)     # Dia do vencimento
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User")
    transactions = relationship("Transaction", back_populates="credit_card")

    @property
    def available_limit(self):
        unpaid_expenses = sum(t.value for t in self.transactions if t.type.name == 'expense' and not t.is_paid)
        return self.limit - unpaid_expenses

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    credit_card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=True) # Novo
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True) # Novo (US-12)
    type = Column(Enum(TransactionType))
    value = Column(Float)
    description = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    is_paid = Column(Boolean, default=True)
    is_fixed = Column(Boolean, default=False)
    day_of_month = Column(Integer, nullable=True)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    receipt_photo = Column(String, nullable=True)
    
    # Campos para Parcelamento (US-11)
    installments_total = Column(Integer, default=1)
    installment_number = Column(Integer, default=1)
    installment_group = Column(String, nullable=True) # UUID para agrupar parcelas
    
    # Campos para GPS (US-GPS)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(String, nullable=True)

    # US-28: Contato associado
    contact_name = Column(String, nullable=True)

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    credit_card = relationship("CreditCard", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    tags = relationship("Tag", secondary=transaction_tags, back_populates="transactions")

class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    monthly_income = Column(Float, nullable=False)
    bill_due_date = Column(String, nullable=False)
    financial_goals = Column(String, nullable=True)

    user = relationship("User", back_populates="financial_profile")


class SavingsGoal(Base):
    """Modelo para metas de economia do usuário (US-10)"""
    __tablename__ = "savings_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    target_value = Column(Float, nullable=False)  # Valor total da meta
    current_progress = Column(Float, default=0.0)  # Quanto já economizou
    deadline = Column(DateTime, nullable=False)  # Data limite para atingir a meta
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")
    
    def get_monthly_target(self) -> float:
        """Calcula quanto precisa economizar por mês para atingir a meta"""
        from datetime import datetime as dt, timezone
        deadline = self.deadline
        if deadline.tzinfo is not None:
            deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)
            
        months_remaining = max(1, (deadline - dt.utcnow()).days // 30)
        return self.target_value / months_remaining if months_remaining > 0 else self.target_value
    
    def get_progress_percentage(self) -> float:
        """Retorna o percentual de progresso (0-100)"""
        if self.target_value <= 0:
            return 0.0
        return min(100.0, (self.current_progress / self.target_value) * 100)


# ==================== SPRINT 3 MODELS ====================

class Tag(Base):
    """US-27: Tags para transações"""
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    color = Column(String, nullable=True, default="#607D8B")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    transactions = relationship("Transaction", secondary=transaction_tags, back_populates="tags")


class Investment(Base):
    """US-21: Aplicações financeiras"""
    __tablename__ = "investments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # CDB, Tesouro, Ações, Poupança, etc.
    invested_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    annual_rate = Column(Float, nullable=True)  # Taxa anual estimada (%)
    start_date = Column(DateTime, nullable=False)
    maturity_date = Column(DateTime, nullable=True)
    institution = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")


class AnnualExpense(Base):
    """US-22: Planejamento de despesas anuais (IPVA, férias, etc.)"""
    __tablename__ = "annual_expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    estimated_value = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    is_paid = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    alert_days_before = Column(Integer, default=30)  # Dias antes para alertar
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")


class ExpenseGroup(Base):
    """US-20: Grupos para dividir despesas"""
    __tablename__ = "expense_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("GroupExpense", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    """Membros de um grupo de despesas"""
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("expense_groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    
    group = relationship("ExpenseGroup", back_populates="members")
    payments = relationship("GroupExpense", foreign_keys="GroupExpense.paid_by_id", back_populates="paid_by")


class GroupExpense(Base):
    """Despesas dentro de um grupo"""
    __tablename__ = "group_expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("expense_groups.id", ondelete="CASCADE"), nullable=False)
    description = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    paid_by_id = Column(Integer, ForeignKey("group_members.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    is_settled = Column(Boolean, default=False)
    
    group = relationship("ExpenseGroup", back_populates="expenses")
    paid_by = relationship("GroupMember", foreign_keys=[paid_by_id], back_populates="payments")
