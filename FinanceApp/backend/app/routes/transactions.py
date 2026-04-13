from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, cast, String
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from app.database import get_db
from app.models import Transaction, Category, User, TransactionType
from app.schemas import TransactionCreate, TransactionResponse, TransactionSummary, CategoryResponse, CategoryCreate
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Cria uma transação com os novos campos de Pago e Fixo"""
    new_transaction = Transaction(
        user_id=user_id,
        category_id=data.category_id,
        type=data.type,
        value=data.value,
        description=data.description,
        date=data.date or datetime.utcnow(),
        is_paid=data.is_paid,
        is_fixed=data.is_fixed,
        day_of_month=data.day_of_month
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    type: Optional[str] = Query(None),
    days: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Lista transações do usuário com filtros avançados (Robusto contra erros 422)"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    
    # Conversão manual ultra-segura
    from datetime import datetime
    s_date = None
    if start_date:
        try:
            # Pega apenas YYYY-MM-DD
            d_parts = [int(p) for p in start_date[:10].split('-')]
            s_date = datetime(d_parts[0], d_parts[1], d_parts[2])
        except: pass

    e_date = None
    if end_date:
        try:
            d_parts = [int(p) for p in end_date[:10].split('-')]
            e_date = datetime(d_parts[0], d_parts[1], d_parts[2])
        except: pass
    
    if type and type != 'all':
        query = query.filter(func.lower(cast(Transaction.type, String)).contains(type.lower()))
    
    if s_date:
        query = query.filter(Transaction.date >= s_date)
    if e_date:
        # Agora temos certeza que e_date é datetime
        end_of_day = e_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(Transaction.date <= end_of_day)
    
    if days and not start_date:
        from datetime import timedelta
        date_limit = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Transaction.date >= date_limit)
        
    return query.order_by(Transaction.date.asc()).all()

@router.get("/summary", response_model=TransactionSummary)
def get_summary(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Dados resumidos para o Dashboard com filtro de mês"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, String
    now = datetime.utcnow()
    
    # Se não informar, usa o mês atual
    if month is None: month = now.month
    if year is None: year = now.year
    
    # Filtro de data para o banco
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # Buscar apenas transações do período
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).all()
    
    # Normalizar "now" para garantir comparação sem fuso horário se necessário
    now_naive = now.replace(tzinfo=None)
    current_day = now_naive.day
    
    # Saldo Disponível (acumulado total)
    all_transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    
    def is_effectively_paid(t, compare_date):
        # A transação NUNCA conta se a data for no futuro
        t_date = t.date.replace(tzinfo=None) if hasattr(t.date, 'tzinfo') else t.date
        if t_date.date() > compare_date.date():
            return False
        
        # Se já está marcado como pago, conta.
        if t.is_paid: return True
        # Se é fixo e o dia do mês já passou (ou é hoje), conta como automático.
        if t.is_fixed and t.day_of_month and t.day_of_month <= current_day:
            return True
        return False

    paid_income_total = sum(t.value for t in all_transactions if t.type == TransactionType.income and is_effectively_paid(t, now_naive))
    paid_expense_total = sum(t.value for t in all_transactions if t.type == TransactionType.expense and is_effectively_paid(t, now_naive))
    balance = paid_income_total - paid_expense_total
    
    # Pendentes (Não pago E não é automático)
    pending_income = sum(t.value for t in transactions if t.type == TransactionType.income and not is_effectively_paid(t, now_naive))
    pending_expense = sum(t.value for t in transactions if t.type == TransactionType.expense and not is_effectively_paid(t, now_naive))

    # Totais do Mês Atual (apenas transações efetivamente recebidas/pagas)
    total_income_month = sum(t.value for t in transactions if t.type == TransactionType.income and is_effectively_paid(t, now_naive))
    total_expense_month = sum(t.value for t in transactions if t.type == TransactionType.expense and is_effectively_paid(t, now_naive))
    
    # Agrupar categorias APENAS para transações efetivamente pagas/recebidas
    # Gastos
    categories_expense_dict = {}
    for t in transactions:
        if t.type == TransactionType.expense and is_effectively_paid(t, now_naive):
            if t.category:
                cat_key = (t.category.id, t.category.name, t.category.icon, t.category.color)
                if cat_key not in categories_expense_dict:
                    categories_expense_dict[cat_key] = 0
                categories_expense_dict[cat_key] += t.value
    
    categories_expense = [
        {"id": k[0], "name": k[1], "icon": k[2], "color": k[3], "value": v}
        for k, v in categories_expense_dict.items()
    ]
    
    # Receitas
    categories_income_dict = {}
    for t in transactions:
        if t.type == TransactionType.income and is_effectively_paid(t, now_naive):
            if t.category:
                cat_key = (t.category.id, t.category.name, t.category.icon, t.category.color)
                if cat_key not in categories_income_dict:
                    categories_income_dict[cat_key] = 0
                categories_income_dict[cat_key] += t.value
    
    categories_income = [
        {"id": k[0], "name": k[1], "icon": k[2], "color": k[3], "value": v}
        for k, v in categories_income_dict.items()
    ]
    
    by_category_expense = [
        {
            "id": c["id"], "name": c["name"], "icon": c["icon"], "color": c["color"], "value": c["value"], 
            "percentage": round((c["value"]/total_expense_month*100),1) if total_expense_month > 0 else 0
        } for c in categories_expense
    ]

    by_category_income = [
        {
            "id": c["id"], "name": c["name"], "icon": c["icon"], "color": c["color"], "value": c["value"], 
            "percentage": round((c["value"]/total_income_month*100),1) if total_income_month > 0 else 0
        } for c in categories_income
    ]

    print(f"DEBUG: Consultando Dashboard para User {user_id} em {month}/{year}")
    
    response = {
        "balance": balance,
        "total_income": total_income_month,
        "total_expense": total_expense_month,
        "pending_income": pending_income,
        "pending_expense": pending_expense,
        "by_category": by_category_expense,
        "by_category_income": by_category_income
    }
    
    return response

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    type: Optional[TransactionType] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Lista categorias (Fixed + User specific) com opção de filtro por tipo"""
    query = db.query(Category).filter(
        (Category.user_id == None) | (Category.user_id == user_id)
    )
    if type:
        query = query.filter(Category.type == type)
    return query.all()

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Cria uma categoria personalizada com ícone e cor"""
    new_category = Category(
        name=data.name, 
        type=data.type, 
        user_id=user_id,
        icon=data.icon,
        color=data.color
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.get("/by-category/{category_id}", response_model=List[TransactionResponse])
def get_transactions_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Lista todas as transações de uma categoria específica"""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.category_id == category_id
    ).order_by(Transaction.date.desc()).all()
    
    print(f"DEBUG: Buscando transações da categoria {category_id} para user {user_id}: {len(transactions)} encontradas")
    return transactions

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Deleta uma transação (verificando se pertence ao usuário)"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    db.delete(transaction)
    db.commit()
    
    print(f"DEBUG: Transação {transaction_id} deletada para user {user_id}")
    return {"message": "Transação deletada com sucesso"}
