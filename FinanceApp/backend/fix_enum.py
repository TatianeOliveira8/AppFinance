import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def update_enum():
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
        
        print("Adicionando 'income'...")
        try:
            cur.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'income'")
            print("Ok!")
        except Exception as e:
            print(f"Erro ao adicionar income: {e}")
            
        print("Adicionando 'expense'...")
        try:
            cur.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'expense'")
            print("Ok!")
        except Exception as e:
            print(f"Erro ao adicionar expense: {e}")
        
        cur.close()
        conn.close()
        print("Finalizado!")
    except Exception as e:
        print(f"Falha na conexão: {e}")

if __name__ == "__main__":
    update_enum()
