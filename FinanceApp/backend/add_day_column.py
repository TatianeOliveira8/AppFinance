import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database import engine

def add_column():
    try:
        with engine.connect() as conn:
            print("Tentando adicionar coluna 'day_of_month' à tabela 'transactions'...")
            conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS day_of_month INTEGER;"))
            conn.commit()
            print("Coluna 'day_of_month' adicionada com sucesso!")
    except Exception as e:
        print(f"Erro ao adicionar coluna: {e}")

if __name__ == "__main__":
    add_column()
