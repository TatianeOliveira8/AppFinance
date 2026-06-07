import sqlite3
from app.database import Base, engine
from app.models import Tag, Investment, AnnualExpense, ExpenseGroup, GroupMember, GroupExpense

def run_migration():
    print("Iniciando migração do Banco de Dados para o Sprint 3...")
    
    # 1. Cria novas tabelas que não existem
    Base.metadata.create_all(bind=engine)
    print("Novas tabelas criadas com sucesso (se não existiam).")
    
    # 2. Adiciona coluna contact_name na tabela transactions se não existir
    conn = sqlite3.connect('financeapp.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN contact_name TEXT")
        conn.commit()
        print("Coluna 'contact_name' adicionada à tabela 'transactions'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Coluna 'contact_name' já existe na tabela 'transactions'.")
        else:
            print(f"Erro ao adicionar coluna: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
