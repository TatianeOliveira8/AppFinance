from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import List, Optional
from app.database import get_db
from app.models import Category, Transaction, TransactionType
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate, TransactionResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("/", response_model=List[CategoryResponse])
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
    
    categories = query.all()
    
    # Calcular gasto do mês atual para cada categoria (Naive UTC para manter consistência com o banco)
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    
    for cat in categories:
        if cat.type == 'expense':
            spent = db.query(func.sum(Transaction.value)).filter(
                Transaction.category_id == cat.id,
                Transaction.user_id == user_id,
                Transaction.date >= start_of_month,
                Transaction.type == 'expense'
            ).scalar() or 0.0
            cat.spent = spent
        else:
            cat.spent = 0.0
            
    return categories

@router.post("/", response_model=CategoryResponse)
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
        color=data.color,
        budget_limit=data.budget_limit,
        is_default=False
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Edita uma categoria"""
    category = db.query(Category).filter(
        (Category.id == category_id) & ((Category.user_id == user_id) | (Category.is_default == True))
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada ou não permitida")
    
    if category.is_default:
        if data.budget_limit is not None:
            category.budget_limit = data.budget_limit
        else:
            raise HTTPException(status_code=403, detail="Apenas o limite de gastos pode ser editado em categorias do sistema")
    else:
        if data.name: category.name = data.name
        if data.type: category.type = data.type
        if data.icon: category.icon = data.icon
        if data.color: category.color = data.color
        if data.budget_limit is not None: category.budget_limit = data.budget_limit
    
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Exclui uma categoria (apenas se não for padrão e pertencer ao usuário)"""
    category = db.query(Category).filter(
        Category.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if category.is_default:
        raise HTTPException(status_code=403, detail="Categorias do sistema não podem ser excluídas")
    
    # Verificar se a categoria pertence ao usuário
    if category.user_id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar esta categoria")
    
    # Ao deletar categoria, as transações ficam sem categoria (null)
    db.query(Transaction).filter(Transaction.category_id == category_id).update({Transaction.category_id: None})
    
    db.delete(category)
    db.commit()
    return {"message": "Categoria excluída com sucesso"}

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
    
    return transactions

@router.delete("/{category_id}/clear")
def clear_category_transactions(
    category_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Deleta todas as transações de uma categoria, mas mantém a categoria (para categorias fixas)"""
    # Verificar se a categoria existe e pertence ao usuário ou é padrão
    category = db.query(Category).filter(
        (Category.id == category_id) & ((Category.user_id == user_id) | (Category.user_id == None))
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    # Deletar todas as transações dessa categoria do usuário
    db.query(Transaction).filter(
        Transaction.category_id == category_id,
        Transaction.user_id == user_id
    ).delete()
    
    db.commit()
    return {"message": "Transações da categoria deletadas com sucesso"}
