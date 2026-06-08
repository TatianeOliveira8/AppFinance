from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Investment, Account, Category, Transaction
from app.schemas import InvestmentCreate, InvestmentUpdate, InvestmentResponse
from app.routes.auth import get_current_user_id
from datetime import datetime

router = APIRouter(prefix="/api/investments", tags=["investments"])

@router.get("/", response_model=List[InvestmentResponse])
def get_investments(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()
    
    now = datetime.utcnow()
    updated_any = False
    for inv in investments:
        if inv.annual_rate and inv.annual_rate > 0 and inv.start_date:
            start_date_naive = inv.start_date.replace(tzinfo=None) if hasattr(inv.start_date, 'tzinfo') else inv.start_date
            days_passed = (now - start_date_naive).days
            if days_passed > 0:
                # Cálculo de Juros Compostos: Montante = Principal * (1 + TaxaAnual)^(Dias/365)
                calculated_value = inv.invested_value * ((1 + inv.annual_rate / 100) ** (days_passed / 365.0))
                calculated_value = round(calculated_value, 2)
                
                # Só atualiza se o rendimento matemático for maior que o registrado (preserva aportes manuais maiores)
                if calculated_value > inv.current_value:
                    inv.current_value = calculated_value
                    updated_any = True

    if updated_any:
        db.commit()
        
    return investments

@router.post("/", response_model=InvestmentResponse)
def create_investment(
    data: InvestmentCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # If account_id is provided, validate and create a transaction first
    if data.account_id:
        account = db.query(Account).filter(Account.id == data.account_id, Account.user_id == user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Conta de origem não encontrada")
        
        # Get or create "Investimentos" category
        category = db.query(Category).filter(
            Category.name == "Investimentos",
            (Category.user_id == user_id) | (Category.is_default == True)
        ).first()
        if not category:
            category = Category(name="Investimentos", type="expense", user_id=user_id)
            db.add(category)
            db.commit()
            db.refresh(category)
            
        # Create outflow transaction
        transaction = Transaction(
            user_id=user_id,
            category_id=category.id,
            account_id=account.id,
            type="expense",
            value=data.invested_value,
            description=f"Aplicação: {data.name}",
            date=data.start_date or datetime.utcnow(),
            is_paid=True
        )
        db.add(transaction)

    investment = Investment(
        user_id=user_id,
        name=data.name,
        type=data.type,
        invested_value=data.invested_value,
        current_value=data.current_value,
        annual_rate=data.annual_rate,
        start_date=data.start_date,
        maturity_date=data.maturity_date,
        institution=data.institution,
        notes=data.notes
    )
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment

@router.put("/{inv_id}", response_model=InvestmentResponse)
def update_investment(
    inv_id: int,
    data: InvestmentUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    investment = db.query(Investment).filter(Investment.id == inv_id, Investment.user_id == user_id).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(investment, key, value)
        
    investment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(investment)
    return investment

@router.delete("/{inv_id}")
def delete_investment(
    inv_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    investment = db.query(Investment).filter(Investment.id == inv_id, Investment.user_id == user_id).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    db.delete(investment)
    db.commit()
    return {"message": "Investimento excluído com sucesso"}
