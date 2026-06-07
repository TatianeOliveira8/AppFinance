import sqlite3

def migrate():
    conn = sqlite3.connect('financeapp.db')
    cursor = conn.cursor()
    
    print("Iniciando migração de Contas (US-12)...")
    
    try:
        # Adicionar coluna account_id à tabela transactions
        cursor.execute("ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id)")
        print("- Coluna account_id adicionada em transactions.")
    except Exception as e:
        print(f"- Coluna account_id já existe ou erro: {e}")

    conn.commit()
    conn.close()
    print("Migração concluída.")

if __name__ == "__main__":
    migrate()
