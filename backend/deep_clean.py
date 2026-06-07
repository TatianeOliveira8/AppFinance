import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def deep_clean():
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
        
        print("Limpando transações e categorias...")
        cur.execute("DELETE FROM transactions")
        cur.execute("DELETE FROM categories")
        print("Banco limpo!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    deep_clean()
