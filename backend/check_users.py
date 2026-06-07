import sqlite3

def check():
    conn = sqlite3.connect('financeapp.db')
    cursor = conn.cursor()
    
    try:
        print("--- USUÁRIOS NO BANCO ---")
        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()
        for u in users:
            print(f"ID: {u[0]} | Email: {u[1]}")
            
        print("\n--- RESUMO DE TRANSAÇÕES ---")
        cursor.execute("SELECT type, count(*) FROM transactions GROUP BY type")
        trans = cursor.fetchall()
        for t in trans:
            print(f"Tipo: {t[0]} | Total: {t[1]}")
            
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check()
