with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "text = contents.decode(\"utf-8\")" in line:
        new_lines.append(line)
        continue
    if "with open(\"debug_last_import.csv\"" in line:
        continue
    if "debug_file.write(text)" in line:
        continue
    new_lines.append(line)

with open('/home/tati/Documentos/AppFinance/FinanceApp/backend/app/routes/transactions.py', 'w') as f:
    f.writelines(new_lines)
