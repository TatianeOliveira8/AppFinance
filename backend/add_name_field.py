from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Tenta adicionar a coluna full_name à tabela users
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            conn.commit()
            print("Coluna 'full_name' adicionada com sucesso!")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("A coluna 'full_name' já existe.")
            else:
                print(f"Erro na migração: {e}")

if __name__ == "__main__":
    migrate()
