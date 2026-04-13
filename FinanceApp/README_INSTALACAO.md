# 🚀 GUIA DE INSTALAÇÃO - FinanceApp

## ⚡ Instalação Rápida (Automática)

### Windows
1. Abra o prompt de comando na pasta do projeto
2. Execute:
   ```bash
   install_all.bat
   ```
3. Siga as instruções que aparecerem

### Mac / Linux
1. Abra o terminal na pasta do projeto
2. Execute:
   ```bash
   bash install_all.sh
   ```
3. Siga as instruções que aparecerem

---

## 📋 O que o script faz?

✅ Verifica se tem Node.js e Python instalados  
✅ Instala todas as dependências do frontend (npm)  
✅ Instala todas as dependências do backend (pip)  
✅ Cria virtual environment do Python  
✅ Verifica se PostgreSQL está instalado  

---

## ⚙️ Configurações Necessárias

**Após a instalação automática**, você PRECISA fazer estes ajustes:

### 1️⃣ URL da API (IMPORTANTE!)
**Arquivo:** `frontend/src/config.ts`

Procure esta linha:
```javascript
const API_BASE_URL = 'http://192.168.15.12:8000/api';
```

Altere `192.168.15.12` para **o IP da sua máquina** onde está rodando o backend.

Para descobrir seu IP:
- **Windows:** `ipconfig` (procure IPv4 Address)
- **Mac/Linux:** `ifconfig` ou `hostname -I`

### 2️⃣ Senha do PostgreSQL
**Arquivo:** `backend/.env`

Procure esta linha:
```env
DB_PASSWORD=1234
```

Se a senha do seu PostgreSQL for diferente, altere para a correta.

---

## 🎯 Rodando a Aplicação

Abra **3 terminais diferentes**:

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate      # Mac/Linux
# ou
venv\Scripts\activate.bat     # Windows

python main.py
```

Esperado: `INFO: Uvicorn running on http://0.0.0.0:8000`

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Esperado: Aparecer um QR code com a mensagem `Metro waiting on exp://...`

### Terminal 3 (Opcional) - Verificar Banco
```bash
PGPASSWORD=1234 psql -U postgres -d financeapp

# Listar usuários:
SELECT id, email, name FROM accounts;

# Para sair:
\q
```

---

## 📱 Testando no Celular

1. **Instale** Expo Go no seu celular (App Store / Google Play)
2. **Escaneie** o QR code que apareceu no Terminal 2
3. *Aguarde* alguns segundos para carregar
4. **Teste** o registro e login

---

## ❌ Troubleshooting

### Erro: "Connection refused"
- ✅ Backend está rodando? (veja Terminal 1)
- ✅ URL está correta em `frontend/src/config.ts`?
- ✅ Firewall está bloqueando porta 8000?

### Erro: "Database connection error"
- ✅ PostgreSQL está ligado?
- ✅ Senha em `backend/.env` está correta?

### Erro: "Port 8081 already in use"
```bash
# Mate o processo antigo
pkill -f "expo start"      # Mac/Linux
# ou
taskkill /F /IM node.exe   # Windows
```

---

## 📚 Instruções Detalhadas

Para instruções mais detalhadas sobre configurações e troubleshooting, leia:

```
cat AJUSTES.md
```

---

## ✅ Checklist Final

Antes de usar, confirme:

- [ ] Node.js instalado
- [ ] Python 3 instalado
- [ ] PostgreSQL instalado e rodando
- [ ] `npm install` executado no frontend
- [ ] `pip install -r requirements.txt` executado no backend
- [ ] URL da API configurada em `frontend/src/config.ts`
- [ ] Senha do PostgreSQL configurada em `backend/.env`
- [ ] Backend rodando em http://0.0.0.0:8000
- [ ] Frontend rodando e mostrando QR code

---

## 🎉 Agora é só aproveitar!

Se tudo rodou sem erros, você está pronto para:
1. Registrar uma conta
2. Fazer login
3. Gerenciar transações
4. Enviar dinheiro entre contas

Boa sorte! 🚀
