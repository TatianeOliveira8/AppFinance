import re

with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'r') as f:
    content = f.read()

# Replace decode logic
old_decode = 'text = contents.decode("utf-8")'
new_decode = '''try:
                text = contents.decode("utf-8")
            except UnicodeDecodeError:
                text = contents.decode("latin-1")'''
content = content.replace(old_decode, new_decode)

# Replace the is_own_export check to be safer
old_check = 'if len(first_row) > 0 and first_row[0].strip().upper() == "ID" and len(first_row) > 3 and "DATA" in first_row[1].strip().upper():'
new_check = 'if len(first_row) > 0 and "ID" in first_row[0].upper() and len(first_row) > 3 and "DATA" in first_row[1].upper():'
content = content.replace(old_check, new_check)

with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'w') as f:
    f.write(content)
