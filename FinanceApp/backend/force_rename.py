from sqlalchemy import text
from app.database import engine

def force_rename():
    with engine.connect() as conn:
        print("Tentando renomear account_id -> user_id...")
        try:
            conn.execute(text("ALTER TABLE transactions RENAME COLUMN account_id TO user_id"))
            conn.execute(text("ALTER TABLE transactions RENAME COLUMN amount TO value"))
            conn.commit()
            print("Comando de renomear enviado e 'commitado'.")
        except Exception as e:
            print(f"Erro ao renomear: {e}")
            conn.rollback()

        print("\nVerificando colunas agora:")
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'"))
        for row in res:
            print(f"- {row[0]}")

if __name__ == "__main__":
    force_rename()
