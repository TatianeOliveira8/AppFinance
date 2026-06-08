with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'r') as f:
    content = f.read()

target = "text = contents.decode(\"latin-1\")"
replacement = """text = contents.decode("latin-1")
            
            with open("debug_last_import.csv", "w", encoding="utf-8") as debug_file:
                debug_file.write(text)
"""
content = content.replace(target, replacement)

target2 = "text = contents.decode(\"utf-8\")"
replacement2 = """text = contents.decode("utf-8")
            with open("debug_last_import.csv", "w", encoding="utf-8") as debug_file:
                debug_file.write(text)
"""
content = content.replace(target2, replacement2)

with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'w') as f:
    f.write(content)
