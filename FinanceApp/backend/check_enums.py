from sqlalchemy import text
from app.database import engine

def check_enums():
    try:
        with engine.connect() as conn:
            # Busca os valores do ENUM no Postgres
            result = conn.execute(text("SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'transactiontype'"))
            enums = result.fetchall()
            print("Valores do ENUM 'transactiontype' no Banco:")
            for e in enums:
                print(f"- {e.value}")
    except Exception as e:
        print(f"Erro ao buscar ENUM: {e}")

if __name__ == "__main__":
    check_enums()
