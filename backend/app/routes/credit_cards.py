from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import CreditCard, Transaction
from app.schemas import CreditCardCreate, CreditCardResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/credit-cards", tags=["credit-cards"])

@router.post("/", response_model=CreditCardResponse)
def create_credit_card(
    data: CreditCardCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    new_card = CreditCard(
        name=data.name,
        limit=data.limit,
        closing_day=data.closing_day,
        due_day=data.due_day,
        user_id=user_id
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card

@router.get("/", response_model=List[CreditCardResponse])
def list_credit_cards(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return db.query(CreditCard).filter(CreditCard.user_id == user_id).all()

@router.delete("/{card_id}")
def delete_credit_card(
    card_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    card = db.query(CreditCard).filter(CreditCard.id == card_id, CreditCard.user_id == user_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    
    # Remover transações ligadas a este cartão para evitar erro de chave estrangeira
    for t in card.transactions:
        db.delete(t)
        
    db.delete(card)
    db.commit()
    return {"message": "Cartão e transações removidos"}

@router.put("/{card_id}", response_model=CreditCardResponse)
def update_credit_card(
    card_id: int,
    data: CreditCardCreate, # Usando o mesmo schema para simplificar
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    card = db.query(CreditCard).filter(CreditCard.id == card_id, CreditCard.user_id == user_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    
    card.name = data.name
    card.limit = data.limit
    card.closing_day = data.closing_day
    card.due_day = data.due_day
    
    db.commit()
    db.refresh(card)
    return card
