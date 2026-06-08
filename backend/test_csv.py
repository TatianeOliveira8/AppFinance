import sys
import io
import csv
from datetime import datetime

contents = b"""ID,Data,Tipo,Valor,Descri\xc3\xa7\xc3\xa3o,Pago,Fixo,Categoria,M\xc3\xa9todo de Pagamento,Contato,Endere\xc3\xa7o
1,2026-06-05,expense,150.00,Supermercado Extra,Sim,N\xc3\xa3o,,,,"""

text = contents.decode("utf-8")
delim = ";" if ";" in text else ","
reader = csv.reader(io.StringIO(text), delimiter=delim)
rows = list(reader)

first_row = rows[0]
has_header = False
is_own_export = False
print(f"First row: {first_row}")

if len(first_row) > 0 and first_row[0].strip().upper() == "ID" and len(first_row) > 3 and "DATA" in first_row[1].strip().upper():
    has_header = True
    is_own_export = True
print(f"is_own_export: {is_own_export}")

parsed = []
for row in rows[1:]:
    print(f"Row: {row}")
    if is_own_export and len(row) >= 5:
        date_str = row[1].strip()
        try:
            date_val = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            date_val = datetime.utcnow()
        try:
            val = abs(float(row[3].strip()))
        except ValueError as e:
            print(f"ValueError: {e}")
            continue
        t_type = "income" if row[2].strip().lower() == "income" else "expense"
        desc_val = row[4].strip()
        parsed.append({
            "date": date_val,
            "value": val,
            "type": t_type,
            "description": desc_val,
        })
        continue
    
print(parsed)
