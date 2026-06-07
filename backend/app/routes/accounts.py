from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Account, Transaction, TransactionType
from app.schemas import AccountCreate, AccountResponse, AccountTransferRequest, AccountTransferResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

@router.post("/", response_model=AccountResponse)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    new_account = Account(
        name=data.name,
        type=data.type,
        initial_balance=data.initial_balance,
        user_id=user_id
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@router.get("/", response_model=List[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    # Adiciona o saldo calculado a cada conta
    for account in accounts:
        account.current_balance = account.calculate_balance()
    return accounts

@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    # Calcula o saldo atual
    account.current_balance = account.calculate_balance()
    return account

@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    # IMPORTANTE: Para a lixeira funcionar, precisamos remover ou desvincular as transações
    # Aqui vamos desvincular para manter o histórico se o usuário quiser, ou você prefere apagar tudo?
    # Por padrão em apps de finanças, apagamos a conta e as transações dela
    for t in account.transactions:
        db.delete(t)
        
    db.delete(account)
    db.commit()
    return {"message": "Conta e transações removidas"}

@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    data: AccountCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    account.name = data.name
    account.type = data.type
    account.initial_balance = data.initial_balance
    
    db.commit()
    db.refresh(account)
    return account

@router.post("/transfer", response_model=AccountTransferResponse)
def transfer_between_accounts(
    data: AccountTransferRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Transferir dinheiro entre duas contas do mesmo usuário (US-12)"""
    
    # Validar que não é transferência para a mesma conta
    if data.from_account_id == data.to_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível transferir para a mesma conta"
        )
    
    # Buscar contas (ambas devem pertencer ao usuário)
    from_account = db.query(Account).filter(
        Account.id == data.from_account_id,
        Account.user_id == user_id
    ).first()
    
    to_account = db.query(Account).filter(
        Account.id == data.to_account_id,
        Account.user_id == user_id
    ).first()
    
    if not from_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta de origem não encontrada"
        )
    
    if not to_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta de destino não encontrada"
        )
    
    # Validar saldo
    from_balance = from_account.calculate_balance()
    if from_balance < data.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Saldo insuficiente. Disponível: R$ {from_balance:.2f}"
        )
    
    # Criar 2 transações: débito (expense) e crédito (income)
    transfer_description = data.description or f"Transferência para {to_account.name}"
    
    # Transação de débito (saída da conta origem)
    debit_transaction = Transaction(
        user_id=user_id,
        account_id=data.from_account_id,
        type=TransactionType.expense,
        value=data.value,
        description=transfer_description,
        date=datetime.utcnow(),
        is_paid=True,
        is_fixed=False,
        payment_method=None,
        category_id=None
    )
    
    # Transação de crédito (entrada na conta destino)
    credit_transaction = Transaction(
        user_id=user_id,
        account_id=data.to_account_id,
        type=TransactionType.income,
        value=data.value,
        description=f"Transferência de {from_account.name}",
        date=datetime.utcnow(),
        is_paid=True,
        is_fixed=False,
        payment_method=None,
        category_id=None
    )
    
    db.add(debit_transaction)
    db.add(credit_transaction)
    db.commit()
    db.refresh(from_account)
    db.refresh(to_account)
    
    # Recalcular saldos
    from_account.current_balance = from_account.calculate_balance()
    to_account.current_balance = to_account.calculate_balance()
    
    return AccountTransferResponse(
        success=True,
        message=f"Transferência de R$ {data.value:.2f} realizada com sucesso",
        from_account=from_account,
        to_account=to_account,
        transfer_amount=data.value
    )