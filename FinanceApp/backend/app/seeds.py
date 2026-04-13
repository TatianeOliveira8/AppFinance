from sqlalchemy.orm import Session
from app.models import User, Category, TransactionType
from app.database import SessionLocal
from app.core.config import hash_password
from datetime import datetime

def create_default_categories():
    db = SessionLocal()
    try:
        # Nomes fixos e limpos. O ícone será decidido pelo Frontend.
        fixed_categories = [
            {"name": "Moradia", "type": TransactionType.expense, "user_id": None},
            {"name": "Alimentação", "type": TransactionType.expense, "user_id": None},
            {"name": "Transporte", "type": TransactionType.expense, "user_id": None},
            {"name": "Saúde", "type": TransactionType.expense, "user_id": None},
            {"name": "Lazer", "type": TransactionType.expense, "user_id": None},
            {"name": "Outros", "type": TransactionType.expense, "user_id": None},
            
            {"name": "Salário", "type": TransactionType.income, "user_id": None},
            {"name": "Renda Extra", "type": TransactionType.income, "user_id": None},
            {"name": "Empréstimo", "type": TransactionType.income, "user_id": None},
        ]

        for cat_data in fixed_categories:
            exists = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not exists:
                db.add(Category(**cat_data))
            else:
                exists.type = cat_data["type"]
                exists.icon = None # Remove qualquer link de imagem que ficou sobrando
        
        db.commit()
    finally:
        db.close()

def create_admin_user():
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.email == "admin@email.com").first()
        if not admin_exists:
            admin = User(
                email="admin@email.com",
                password_hash=hash_password("Admin1"),
                created_at=datetime.utcnow(),
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
