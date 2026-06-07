import sqlite3

def migrate():
    conn = sqlite3.connect('financeapp.db')
    cursor = conn.cursor()
    
    print("Iniciando migração de transações (US-11)...")
    
    try:
        # Adicionar colunas novas à tabela categories (US-09)
        cursor.execute("ALTER TABLE categories ADD COLUMN budget_limit FLOAT")
        print("- Coluna budget_limit adicionada em categories.")
    except Exception as e:
        print(f"- Coluna budget_limit já existe ou erro: {e}")

    try:
        # Adicionar colunas novas à tabela transactions (US-11)
        cursor.execute("ALTER TABLE transactions ADD COLUMN credit_card_id INTEGER REFERENCES credit_cards(id)")
        print("- Coluna credit_card_id adicionada.")
    except Exception as e:
        print(f"- Erro ao adicionar credit_card_id: {e}")

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN installments_total INTEGER DEFAULT 1")
        print("- Coluna installments_total adicionada.")
    except Exception as e:
        print(f"- Erro ao adicionar installments_total: {e}")

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN installment_number INTEGER DEFAULT 1")
        print("- Coluna installment_number adicionada.")
    except Exception as e:
        print(f"- Erro ao adicionar installment_number: {e}")

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN installment_group TEXT")
        print("- Coluna installment_group adicionada.")
    except Exception as e:
        print(f"- Erro ao adicionar installment_group: {e}")

    conn.commit()
    conn.close()
    print("Migração concluída.")

if __name__ == "__main__":
    migrate()
