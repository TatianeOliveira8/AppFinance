from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Transaction, Category, Account, CreditCard, SavingsGoal, FinancialProfile
from app.schemas import UserCreate, UserLogin, TokenResponse, UserResponse, UserBase, ChangePassword
from app.core.config import create_access_token, hash_password, verify_password, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Função para extrair o usuário do token (Dependency Injection)
def get_current_user_id(authorization: str = Header(None)):
    """Extrai e valida o token JWT"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    scheme, _, param = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esquema de autenticação inválido",
        )
    
    payload = decode_access_token(param)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    return int(user_id)

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registra um novo usuário (PRD Simplificado)"""
    
    # Verifica se email já existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado")
    
    # Cria usuário
    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hashed_password,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Gera token JWT
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name
    )

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Faz login"""
    try:
        user = db.query(User).filter(User.email == credentials.email).first()
        
        if not user or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos"
            )
        
        # Gera token JWT
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            full_name=user.full_name
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"ERRO CRÍTICO NO LOGIN:\n{error_detail}")
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Erro interno no servidor",
                "error": str(e),
                "type": str(type(e).__name__)
            }
        )

@router.get("/verify-user", response_model=dict)
def verify_user(email: str, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Verifica se um usuário com o email especificado existe e retorna seu nome completo"""
    user = db.query(User).filter(User.email == email.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Este e-mail não possui o aplicativo instalado.")
    return {"id": user.id, "full_name": user.full_name or user.email, "email": user.email}

@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Obtém dados do usuário atual"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.put("/me", response_model=UserResponse)
def update_profile(
    user_data: UserBase,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Atualiza o perfil do usuário (nome e email)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verifica se novo email já existe em outro usuário
    if user_data.email != user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Este email já está em uso")
        user.email = user_data.email
    
    user.full_name = user_data.full_name
    db.commit()
    db.refresh(user)
    return user

@router.post("/change-password", status_code=200)
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Altera a senha do usuário autenticado após validar a senha atual"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta"
        )

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso"}

@router.post("/deactivate", status_code=200)
def deactivate_account(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Desativa a conta do usuário (mantém os dados, apenas bloqueia o acesso)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Marca o email com prefixo para bloquear novo login sem apagar dados
    if not user.email.startswith("deactivated_"):
        user.email = f"deactivated_{user_id}_{user.email}"
    db.commit()
    return {"message": "Conta desativada com sucesso"}

@router.delete("/delete", status_code=200)
def delete_account(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Remove permanentemente a conta e todos os dados do usuário (LGPD)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Deleta em ordem para respeitar foreign keys
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    db.query(Category).filter(Category.user_id == user_id).delete()
    db.query(Account).filter(Account.user_id == user_id).delete()
    db.query(CreditCard).filter(CreditCard.user_id == user_id).delete()
    db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).delete()
    db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Conta deletada permanentemente"}
