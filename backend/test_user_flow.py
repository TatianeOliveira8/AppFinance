import urllib.request
import urllib.error
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        body = json.dumps(data).encode('utf-8') if data else None
        with urllib.request.urlopen(req, data=body) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 500, str(e)

print("--- INICIANDO TESTE DO USUÁRIO ---")

test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
print(f"[*] Registrando usuário de teste ({test_email})...")
make_request("POST", "/auth/register", {"name": "User Test", "email": test_email, "password": "password123"})
status, login_res = make_request("POST", "/auth/login", {"email": test_email, "password": "password123"})
if status != 200:
    print("❌ Falha no login:", login_res)
    exit(1)

token = login_res['token']
print("✅ Login efetuado com sucesso!")

print("\n[1] Criando Grupo de Despesas (Viagem)...")
status, group = make_request("POST", "/expense-groups/", {
    "name": "Viagem para Praia",
    "description": "Férias de Julho",
    "members": [{"name": "João", "email": "joao@teste.com"}, {"name": "Maria", "email": "maria@teste.com"}]
}, token)

if status == 200:
    group_id = group['id']
    print(f"✅ Grupo criado com sucesso! ID: {group_id}")
    
    joao_id = next((m['id'] for m in group['members'] if m['name'] == 'João'), None)
    
    print("\n[2] Adicionando Despesa de R$ 300,00 paga pelo João...")
    status_exp, exp = make_request("POST", f"/expense-groups/{group_id}/expenses", {
        "description": "Gasolina",
        "value": 300.0,
        "paid_by_id": joao_id
    }, token)
    
    if status_exp == 200:
        print("✅ Despesa adicionada com sucesso no grupo!")
    else:
        print("❌ Erro ao adicionar despesa:", exp)
        
    print("\n[3] Calculando Liquidação...")
    status_settle, settle = make_request("GET", f"/expense-groups/{group_id}/settlement", None, token)
    if status_settle == 200:
        print("✅ Cálculo de divisão de contas retornou com sucesso!")
        print(json.dumps(settle, indent=2, ensure_ascii=False))
else:
    print("❌ Erro ao criar grupo:", group)

print("\n[4] Registrando Despesa Anual (IPVA)...")
status_ae, ae = make_request("POST", "/annual-expenses/", {
    "name": "IPVA 2026",
    "value": 1500.00,
    "due_month": 1,
    "is_paid": False
}, token)
if status_ae == 200:
    print("✅ Despesa Anual IPVA cadastrada com sucesso!")
else:
    print("❌ Erro ao registrar despesa anual:", ae)

print("\n[5] Registrando Investimento (Tesouro Selic)...")
status_inv, inv = make_request("POST", "/investments/", {
    "name": "Tesouro Selic",
    "type": "Renda Fixa",
    "value": 5000.00,
    "return_rate": 10.5
}, token)
if status_inv == 200:
    print("✅ Investimento registrado com sucesso!")
else:
    print("❌ Erro ao registrar investimento:", inv)

print("\n--- TESTE FINALIZADO COM SUCESSO ---")
