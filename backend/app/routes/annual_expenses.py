from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import AnnualExpense
from app.schemas import AnnualExpenseCreate, AnnualExpenseUpdate, AnnualExpenseResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/annual-expenses", tags=["annual_expenses"])

@router.get("/", response_model=List[AnnualExpenseResponse])
def get_annual_expenses(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return db.query(AnnualExpense).filter(AnnualExpense.user_id == user_id).all()

@router.post("/", response_model=AnnualExpenseResponse)
def create_annual_expense(
    data: AnnualExpenseCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    expense = AnnualExpense(
        user_id=user_id,
        name=data.name,
        estimated_value=data.estimated_value,
        due_date=data.due_date,
        is_paid=data.is_paid,
        notes=data.notes,
        alert_days_before=data.alert_days_before
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.put("/{ae_id}", response_model=AnnualExpenseResponse)
def update_annual_expense(
    ae_id: int,
    data: AnnualExpenseUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    expense = db.query(AnnualExpense).filter(AnnualExpense.id == ae_id, AnnualExpense.user_id == user_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa anual não encontrada")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(expense, key, value)
        
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{ae_id}")
def delete_annual_expense(
    ae_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    expense = db.query(AnnualExpense).filter(AnnualExpense.id == ae_id, AnnualExpense.user_id == user_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa anual não encontrada")
    db.delete(expense)
    db.commit()
    return {"message": "Despesa anual excluída com sucesso"}
