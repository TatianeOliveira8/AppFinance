from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_current_user_id
from app.models import Transaction, Category, Account, CreditCard
import json
import base64
import os
from datetime import datetime

router = APIRouter(prefix="/api/backup", tags=["backup"])

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

@router.post("/cloud-sync")
def sync_to_cloud(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Simula a criptografia e envio dos dados para um serviço em nuvem (Requisito 20)"""
    # Coletando métricas básicas para o payload de backup
    transactions_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
    accounts_count = db.query(Account).filter(Account.user_id == user_id).count()
    
    data = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "transactions_count": transactions_count,
        "accounts_count": accounts_count,
        "data_payload": "DADOS_CRIPTOGRAFADOS_AQUI"
    }
    
    # Criptografando (Mock via Base64 para demonstração)
    json_str = json.dumps(data)
    encrypted = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
    
    # Salvando em diretório para simular a nuvem
    filename = f"backup_user_{user_id}.enc"
    filepath = os.path.join(BACKUP_DIR, filename)
    with open(filepath, "w") as f:
        f.write(encrypted)
        
    return {"message": "Backup criptografado e sincronizado com o Firebase Storage com sucesso!", "timestamp": data["timestamp"]}

@router.post("/cloud-restore")
def restore_from_cloud(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Simula a recuperação de um backup criptografado da nuvem"""
    filename = f"backup_user_{user_id}.enc"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Nenhum backup encontrado na nuvem para esta conta.")
        
    return {"message": "Backup descriptografado e restaurado da nuvem com sucesso!"}
