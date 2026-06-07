from sqlalchemy import text
from app.database import engine, SQLALCHEMY_DATABASE_URL

def inspect_columns(table_name):
    print(f"Conectado em: {SQLALCHEMY_DATABASE_URL}")
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'"))
            columns = result.fetchall()
            print(f"Colunas na tabela '{table_name}':")
            for col in columns:
                print(f"- {col[0]} ({col[1]})")
    except Exception as e:
        print(f"Erro ao inspecionar {table_name}: {e}")

if __name__ == "__main__":
    inspect_columns("transactions")
