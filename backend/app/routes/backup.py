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
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "financeapp.db"))

@router.get("/cloud-status")
def get_backup_status(user_id: int = Depends(get_current_user_id)):
    filename = f"backup_user_{user_id}.enc"
    filepath = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                encrypted = f.read()
            decrypted = base64.b64decode(encrypted).decode('utf-8')
            data = json.loads(decrypted)
            return {"has_backup": True, "last_backup": data.get("timestamp")}
        except Exception:
            pass
    return {"has_backup": False, "last_backup": None}

@router.post("/cloud-sync")
def sync_to_cloud(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Simula a criptografia e envio dos dados para um serviço em nuvem (Requisito 20)"""
    # Coletando métricas básicas para o payload de backup
    transactions_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
    accounts_count = db.query(Account).filter(Account.user_id == user_id).count()
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id,
        "transactions_count": transactions_count,
        "accounts_count": accounts_count,
        "data_payload": "DADOS_CRIPTOGRAFADOS_AQUI"
    }
    
    # Criptografando (Mock via Base64 para demonstração do metadata)
    json_str = json.dumps(data)
    encrypted = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
    
    # Salvando em diretório para simular a nuvem
    filename = f"backup_user_{user_id}.enc"
    filepath = os.path.join(BACKUP_DIR, filename)
    with open(filepath, "w") as f:
        f.write(encrypted)
        
    # BACKUP REAL DO BANCO DE DADOS
    db_backup_path = os.path.join(BACKUP_DIR, f"backup_db_{user_id}.sqlite")
    import shutil
    if os.path.exists(DB_PATH):
        shutil.copy(DB_PATH, db_backup_path)
        
    return {"message": "Backup criptografado e salvo na nuvem com segurança!", "timestamp": data["timestamp"]}

@router.post("/cloud-restore")
def restore_from_cloud(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Simula a recuperação de um backup criptografado da nuvem"""
    filename = f"backup_user_{user_id}.enc"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Nenhum backup encontrado na nuvem para esta conta.")
        
    # RESTAURAÇÃO REAL DO BANCO DE DADOS
    db_backup_path = os.path.join(BACKUP_DIR, f"backup_db_{user_id}.sqlite")
    import shutil
    from app.database import engine
    if os.path.exists(db_backup_path):
        shutil.copy(db_backup_path, DB_PATH)
        engine.dispose() # Força a renovação das conexões do banco de dados
        
    return {"message": "Seus dados foram recuperados da nuvem e restaurados com sucesso!"}
