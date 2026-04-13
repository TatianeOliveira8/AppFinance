from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5434")
DB_NAME = os.getenv("DB_NAME", "financeapp")

url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(url)

print("--- INVESTIGAÇÃO DE RECEITAS ---")

with engine.connect() as conn:
    # 1. Total por tipo
    res = conn.execute(text("SELECT type, count(*) FROM transactions GROUP BY type")).fetchall()
    print(f"Transações por tipo: {res}")
    
    # 2. Receitas de Abril 2026
    print("\nReceitas de Abril 2026:")
    res = conn.execute(text("""
        SELECT t.description, t.value, t.date, t.type, c.name as category, t.is_paid
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE EXTRACT(MONTH FROM t.date) = 4 AND EXTRACT(YEAR FROM t.date) = 2026
    """)).fetchall()
    
    for r in res:
        print(f" - {r.description} | {r.value} | {r.date} | {r.type} | Cat: {r.category} | Paid: {r.is_paid}")

    # 3. Categorias vinculadas a receitas
    print("\nCategorias vinculadas a Receitas (Total):")
    res = conn.execute(text("""
        SELECT c.name, count(t.id) 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        WHERE t.type::text LIKE '%income%'
        GROUP BY c.name
    """)).fetchall()
    for r in res:
        print(f" - {r[0]}: {r[1]}")
