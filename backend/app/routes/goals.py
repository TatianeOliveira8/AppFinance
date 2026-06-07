from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.database import get_db
from app.models import SavingsGoal
from app.schemas import SavingsGoalCreate, SavingsGoalResponse, SavingsGoalUpdate
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/goals", tags=["savings-goals"])


@router.post("/", response_model=SavingsGoalResponse)
def create_goal(
    data: SavingsGoalCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Criar uma nova meta de economia"""
    
    if data.target_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor da meta deve ser maior que 0"
        )
    
    # Garante que a data seja naive UTC para comparação
    deadline = data.deadline
    if deadline.tzinfo is not None:
        deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)
    
    if deadline <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data limite deve ser no futuro"
        )
    
    goal = SavingsGoal(
        user_id=user_id,
        name=data.name,
        target_value=data.target_value,
        current_progress=data.current_progress or 0.0,
        deadline=deadline,
        description=data.description
    )
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/", response_model=List[SavingsGoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Listar todas as metas do usuário"""
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).all()
    return goals


@router.get("/{goal_id}", response_model=SavingsGoalResponse)
def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Obter detalhes de uma meta específica"""
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    return goal


@router.put("/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: int,
    data: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Atualizar uma meta existente"""
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Validações
    if data.target_value is not None and data.target_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor da meta deve ser maior que 0"
        )
    
    if data.deadline is not None:
        deadline = data.deadline
        if deadline.tzinfo is not None:
            deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)
            
        if deadline <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data limite deve ser no futuro"
            )
        goal.deadline = deadline
    
    if data.current_progress is not None and data.current_progress < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progresso não pode ser negativo"
        )
    
    # Atualizar campos fornecidos
    if data.name is not None:
        goal.name = data.name
    if data.target_value is not None:
        goal.target_value = data.target_value
    if data.description is not None:
        goal.description = data.description
    if data.current_progress is not None:
        goal.current_progress = data.current_progress
    
    goal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Deletar uma meta"""
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    db.delete(goal)
    db.commit()


@router.patch("/{goal_id}/progress", response_model=SavingsGoalResponse)
def update_goal_progress(
    goal_id: int,
    amount: float,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Adicionar progresso a uma meta (ex: adicionar R$ 100 economizado)"""
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    if amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor de progresso não pode ser negativo"
        )
    
    goal.current_progress += amount
    goal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(goal)
    return goal
