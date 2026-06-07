import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def deep_fix_database():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("--- Iniciando Correção Profunda ---")
        
        # Correção na tabela Categories
        print("Verificando tabela 'categories'...")
        cur.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(20)")
        cur.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(100)")
        print("Tabela 'categories' OK!")
        
        # Correção na tabela Transactions
        print("Verificando tabela 'transactions'...")
        cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()")
        cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE")
        cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE")
        print("Tabela 'transactions' OK!")
        
        cur.close()
        conn.close()
        print("--- Banco de Dados Atualizado com Sucesso! ---")
    except Exception as e:
        print(f"Erro Crítico: {e}")

if __name__ == "__main__":
    deep_fix_database()
