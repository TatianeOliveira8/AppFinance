import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_transaction_table():
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
        
        print("Adicionando coluna 'date' em transactions...")
        cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()")
        print("Sucesso!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    fix_transaction_table()
