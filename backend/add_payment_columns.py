"""
Script de migração: Adiciona colunas payment_method e receipt_photo
à tabela transactions (se não existirem).

Execute: python add_payment_columns.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "financeapp.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Verificar colunas existentes
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "payment_method" not in columns:
        cursor.execute("ALTER TABLE transactions ADD COLUMN payment_method VARCHAR")
        print("✅ Coluna 'payment_method' adicionada com sucesso!")
    else:
        print("ℹ️  Coluna 'payment_method' já existe.")
    
    if "receipt_photo" not in columns:
        cursor.execute("ALTER TABLE transactions ADD COLUMN receipt_photo VARCHAR")
        print("✅ Coluna 'receipt_photo' adicionada com sucesso!")
    else:
        print("ℹ️  Coluna 'receipt_photo' já existe.")
    
    conn.commit()
    conn.close()
    print("\n🎉 Migração concluída!")

if __name__ == "__main__":
    migrate()
