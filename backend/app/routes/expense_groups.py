from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import ExpenseGroup, GroupMember, GroupExpense, User
from app.schemas import ExpenseGroupCreate, ExpenseGroupUpdate, ExpenseGroupResponse, GroupMemberCreate, GroupMemberResponse, GroupExpenseCreate, GroupExpenseResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/expense-groups", tags=["expense_groups"])

@router.get("/", response_model=List[ExpenseGroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return db.query(ExpenseGroup).filter(ExpenseGroup.created_by == user_id).all()

@router.post("/", response_model=ExpenseGroupResponse)
def create_group(
    data: ExpenseGroupCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # Enforce that all added members have emails and exist in DB
    for member_data in data.members:
        if not member_data.email:
            raise HTTPException(status_code=400, detail="E-mail é obrigatório para todos os membros.")
        
        # Check if user exists by email
        existing_user = db.query(User).filter(User.email == member_data.email).first()
        if not existing_user:
            raise HTTPException(
                status_code=400, 
                detail=f"O e-mail {member_data.email} não possui o aplicativo instalado."
            )

    group = ExpenseGroup(name=data.name, description=data.description, created_by=user_id)
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Add creator as initial member
    creator = db.query(User).filter(User.id == user_id).first()
    creator_name = (creator.full_name or creator.email) if creator else "Você (Criador)"
    creator_member = GroupMember(group_id=group.id, name=creator_name, email=creator.email if creator else None)
    db.add(creator_member)
    
    for member_data in data.members:
        existing_user = db.query(User).filter(User.email == member_data.email).first()
        member = GroupMember(
            group_id=group.id, 
            name=existing_user.full_name or member_data.name, 
            email=member_data.email
        )
        db.add(member)
        
    db.commit()
    db.refresh(group)
    return group

@router.get("/{group_id}", response_model=ExpenseGroupResponse)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    return group

@router.post("/{group_id}/members", response_model=GroupMemberResponse)
def add_member(
    group_id: int,
    data: GroupMemberCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id, ExpenseGroup.created_by == user_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado ou você não é o criador")
        
    if not data.email:
        raise HTTPException(status_code=400, detail="E-mail é obrigatório para adicionar participantes ao grupo.")
        
    # Check if user exists by email
    existing_user = db.query(User).filter(User.email == data.email).first()
    if not existing_user:
        raise HTTPException(
            status_code=400, 
            detail=f"O e-mail {data.email} não possui o aplicativo instalado."
        )
        
    # Check if already in the group
    existing_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.email == data.email).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Este usuário já faz parte do grupo.")
        
    member = GroupMember(
        group_id=group_id, 
        name=existing_user.full_name or data.name, 
        email=data.email
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.post("/{group_id}/expenses", response_model=GroupExpenseResponse)
def add_expense(
    group_id: int,
    data: GroupExpenseCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
        
    member = db.query(GroupMember).filter(GroupMember.id == data.paid_by_id, GroupMember.group_id == group_id).first()
    if not member:
        raise HTTPException(status_code=400, detail="Membro pagador inválido para este grupo")
        
    expense = GroupExpense(
        group_id=group_id,
        description=data.description,
        value=data.value,
        paid_by_id=data.paid_by_id,
        date=data.date or datetime.utcnow()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.get("/{group_id}/settle")
def calculate_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
        
    members = group.members
    expenses = [e for e in group.expenses if not e.is_settled]
    
    if not members:
        return {"settlements": [], "total_expenses": 0}
        
    total_expenses = sum(e.value for e in expenses)
    share = total_expenses / len(members)
    
    # Calculate balance for each member
    balances = {}
    for m in members:
        paid = sum(e.value for e in expenses if e.paid_by_id == m.id)
        balances[m.id] = {
            "id": m.id,
            "name": m.name,
            "paid": paid,
            "net": paid - share
        }
        
    # Split into debtors and creditors
    debtors = []
    creditors = []
    
    for m_id, info in balances.items():
        if info["net"] < -0.01:
            debtors.append(info)
        elif info["net"] > 0.01:
            creditors.append(info)
            
    # Sort descending
    debtors.sort(key=lambda x: x["net"])
    creditors.sort(key=lambda x: x["net"], reverse=True)
    
    settlements = []
    d_idx = 0
    c_idx = 0
    
    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]
        
        amount = min(-debtor["net"], creditor["net"])
        
        settlements.append({
            "from_id": debtor["id"],
            "from_name": debtor["name"],
            "to_id": creditor["id"],
            "to_name": creditor["name"],
            "value": round(amount, 2)
        })
        
        debtor["net"] += amount
        creditor["net"] -= amount
        
        if abs(debtor["net"]) < 0.01:
            d_idx += 1
        if abs(creditor["net"]) < 0.01:
            c_idx += 1
            
    return {
        "total_expenses": total_expenses,
        "share_per_member": round(share, 2),
        "balances": list(balances.values()),
        "settlements": settlements
    }

@router.post("/{group_id}/settle")
def settle_group_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
        
    for expense in group.expenses:
        expense.is_settled = True
        
    db.commit()
    return {"message": "Despesas do grupo marcadas como liquidadas"}

@router.put("/{group_id}", response_model=ExpenseGroupResponse)
def update_group(
    group_id: int,
    data: ExpenseGroupUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id, ExpenseGroup.created_by == user_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado ou você não é o criador")
        
    for key, value in data.dict(exclude_unset=True).items():
        setattr(group, key, value)
        
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id, ExpenseGroup.created_by == user_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado ou você não é o criador")
        
    db.delete(group)
    db.commit()
    return {"message": "Grupo excluído com sucesso"}
