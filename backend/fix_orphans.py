import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Transaction, Account, User

db = SessionLocal()
users = db.query(User).all()

for user in users:
    # Check if user has transactions without account_id
    orphans = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.account_id == None,
        Transaction.credit_card_id == None
    ).all()
    
    if orphans:
        # Find user's first account or create one
        account = db.query(Account).filter(Account.user_id == user.id).first()
        if not account:
            account = Account(name="Carteira", type="Dinheiro", initial_balance=0.0, user_id=user.id)
            db.add(account)
            db.commit()
            db.refresh(account)
        
        # Update orphans
        for t in orphans:
            t.account_id = account.id
        
        db.commit()
        print(f"User {user.email}: Migrated {len(orphans)} transactions to Account {account.name}")

db.close()
