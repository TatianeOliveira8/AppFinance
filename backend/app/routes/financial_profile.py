from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import FinancialProfileCreate, FinancialProfileResponse
from app.models import FinancialProfile, User
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("/financial-profile", response_model=FinancialProfileResponse)
def create_financial_profile(
    profile_data: FinancialProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == current_user.id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Financial profile already exists.")

    new_profile = FinancialProfile(**profile_data.dict(), user_id=current_user.id)
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

@router.get("/financial-profile", response_model=FinancialProfileResponse)
def get_financial_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Financial profile not found.")
    return profile

@router.put("/financial-profile", response_model=FinancialProfileResponse)
def update_financial_profile(
    profile_data: FinancialProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Financial profile not found.")
    
    profile.monthly_income = profile_data.monthly_income
    profile.bill_due_date = profile_data.bill_due_date
    profile.financial_goals = profile_data.financial_goals
    
    db.commit()
    db.refresh(profile)
    return profile