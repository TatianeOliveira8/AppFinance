# 💰 FinanceApp - Aplicação de Gestão de Finanças Pessoais

Aplicação completa (frontend + backend) para gerenciar finanças pessoais com suporte a contas individuais e conjuntas.

## 🎯 O Que É?

FinanceApp é um app mobile + API que permite:
- ✅ Registrar e fazer login com segurança
- ✅ Gerenciar depósitos, saques e transferências
- ✅ Visualizar histórico de transações
- ✅ Suporte a contas individuais e conjuntas (2 usuários = 1 conta)
- ✅ Validação de CPF, email, força de senha
- ✅ Senha criptografada com bcrypt
- ✅ Autenticação JWT (token de 1 dia)
- ✅ Banco de dados PostgreSQL

## 📁 Estrutura

```
projeto_Tatiane/
├── backend/                      # API FastAPI + PostgreSQL
│   ├── main.py                   # Inicia a API
│   ├── requirements.txt          # Dependências Python
│   ├── .env                      # Configurações (credenciais)
│   ├── .env.example              # Modelo
│   ├── README.md                 # Instruções backend
│   └── app/
│       ├── models/               # Tabelas (Account, Transaction)
│       ├── routes/               # Endpoints (auth, transactions)
│       ├── schemas/              # Validações Pydantic
│       ├── utils/                # Funções auxiliares
│       ├── core/config.py        # Configurações
│       └── database.py           # Conexão PostgreSQL
│
├── frontend/                     # App React Native + Expo
│   ├── package.json              # Dependências npm
│   ├── app.json                  # Config Expo
│   ├── README.md                 # Instruções frontend
│   └── src/
│       ├── screens/              # Telas (Login, Home, etc)
│       ├── context/              # AuthContext (gerencia user)
│       ├── services/             # Cliente HTTP (api.ts)
│       ├── utils/                # Formatadores e validadores
│       ├── router.tsx            # Navegação
│       └── index.tsx             # Ponto de entrada
│
├── SETUP_COMPLETO.md             # Guia step-by-step completo
├── POSTGRES_SETUP.md             # Setup do PostgreSQL
├── MUDANCAS_REALIZADAS.md        # O que mudou (SQLite → PostgreSQL)
├── USANDO_COMPILA.md             # Como fazer backup
└── compila.py                    # Script backup automático
```

## 🚀 Quick Start (2 Minutos)

### 1️⃣ Pré-requisitos
- PostgreSQL instalado e rodando
- Python 3.8+
- Node.js 16+

### 2️⃣ Backend (Terminal 1)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Edite .env com suas credenciais PostgreSQL
nano .env

# Inicie
python main.py
# Deve mostrar: INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3️⃣ Frontend (Terminal 2)

```bash
cd frontend
npm install  # ou yarn install
npm start

# Pressione 'a' para Android, 'i' para iOS, 'w' para web
```

✅ **Pronto!** Abra o app e registre-se.

---

## 📚 Documentação em Detalhes

- **[SETUP_COMPLETO.md](SETUP_COMPLETO.md)** ← **LEIA ISTO PRIMEIRO**
  - Instalação passo-a-passo (PostgreSQL, backend, frontend)
  - Validações de funcionamento
  - Troubleshooting

- **[POSTGRES_SETUP.md](POSTGRES_SETUP.md)** 
  - Setup detalhado do PostgreSQL (Linux/Windows/macOS)
  - Criação de banco e usuário
  - Conexão com backend

- **[backend/README.md](backend/README.md)**
  - API endpoints
  - Exemplos de requisições
  - Modelos de dados
  - Variáveis de ambiente

- **[frontend/README.md](frontend/README.md)**
  - Estrutura do código
  - Como adicionar novas telas
  - Autenticação e segurança

- **[MUDANCAS_REALIZADAS.md](MUDANCAS_REALIZADAS.md)**
  - O que mudou de SQLite para PostgreSQL
  - Impacto das alterações

---

## 🏗️ Arquitetura

```
Celular (React Native + Expo)
    ↓ (HTTP + JWT Token)
API Backend (FastAPI)
    ↓ (SQLAlchemy ORM)
PostgreSQL Database
```

**Fluxo de Dados:**
1. User registra-se → frontend envia POST /register
2. Backend valida e cria Account no PostgreSQL
3. Backend retorna JWT token
4. Frontend armazena token em expo-secure-store
5. Próximas requisições incluem token no header

---

## 🔐 Segurança

| Camada | Proteção |
|--------|----------|
| **Senha** | bcrypt (hash + salt) |
| **Token** | JWT HS256, 1 dia de validade |
| **Token Storage** | expo-secure-store (criptografado no device) |
| **Validação** | CPF, email, força de senha |
| **Banco** | PostgreSQL (servidor, não local) |

---

## 📊 Banco de Dados

### Tabela `account`
```
id (int)
name (string)
email (string)
cpf (string, unique)
password_hash (string)
account_type ('individual' ou 'joint')
balance (decimal)
second_email (string, optional)
created_at (timestamp)
```

### Tabela `transaction`
```
id (int)
account_id (int, FK)
type ('deposit', 'withdrawal', 'transfer')
amount (decimal)
description (string)
recipient_id (int, optional para transfers)
transfer_method (string, optional)
created_at (timestamp)
```

**O banco é criado automaticamente** na primeira execução do backend.

---

## 🎯 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Registrar novo usuário |
| POST | `/auth/login` | Fazer login |
| GET | `/auth/me` | Dados do usuário logado |
| POST | `/transactions/deposit` | Fazer depósito |
| POST | `/transactions/withdrawal` | Fazer saque |
| POST | `/transactions/transfer` | Transferência entre contas |
| GET | `/transactions/history` | Histórico com paginação |

**Documentação interativa:** http://localhost:8000/docs (Swagger)

---

## 🔧 Variáveis de Ambiente

Arquivo `backend/.env`:

```env
# PostgreSQL
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeapp

# JWT
SECRET_KEY=sua-chave-secreta-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=1

# App
DEBUG=True
API_VERSION=1.0.0
```

---

## 💾 Backup e Distribuição

```bash
# Criar backup (excluindo node_modules, venv, etc)
python3 compila.py

# Gera: Salva_Amiga.zip (7 MB)
# Compartilhe sem problemas!
```

Veja [USANDO_COMPILA.md](USANDO_COMPILA.md) para mais detalhes.

---

## ❓ FAQ

### Por que PostgreSQL em vez de SQLite?

✅ **Escalável** - suporta múltiplos usuários  
✅ **Produção** - padrão da indústria  
✅ **Portabilidade** - pode estar em outro servidor  
✅ **Segurança** - credenciais separadas  

### Como usar em produção?

1. Deploy backend: Railway, Render, AWS RDS
2. Deploy frontend: EAS Build (Expo)
3. Conectar aos endpoints da sua API

### E se eu quiser mudar algo?

- **Tela nova**: adicionar arquivo em `frontend/src/screens/`
- **Endpoint novo**: adicionar rota em `backend/app/routes/`
- **Campo novo**: atualizar modelo em `backend/app/models/`

Tudo bem documentado e estruturado!

---

## 📞 Troubleshooting

- **"Could not translate host name"** → PostgreSQL não está rodando
- **"Module not found"** → Rodar `npm install` ou `pip install -r requirements.txt`
- **"Database does not exist"** → Criar com `createdb financeapp`

Veja [SETUP_COMPLETO.md](SETUP_COMPLETO.md) para mais soluções.

---

## ✅ Status

- ✅ Sprint 1 100% concluída
- ✅ Backend pronto para produção
- ✅ Frontend funcional em Android, iOS, Web
- ✅ Documentação completa
- ✅ Sistema de backup automático

**Pronto para usar e manter! 🚀**

---

*Criado em 11 de abril de 2026*

# Criar ambiente virtual
python -m venv venv

# Ativar (Linux/Mac):
source venv/bin/activate
# Ou (Windows):
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Rodar servidor
python main.py
```

Backend disponível em: **http://localhost:8000**

Documentação automática: **http://localhost:8000/docs**

### 2️⃣ Frontend (Terminal 2)

```bash
cd frontend

# Instalar dependências
npm install

# Rodar Expo
npm start
```

Escolha a plataforma:
- `a` para Android
- `i` para iOS
- `w` para Web

## 🔌 Endpoints Principais

### Autenticação
```bash
POST   /api/auth/register          # Criar conta
POST   /api/auth/login             # Fazer login
GET    /api/auth/me                # Dados atuais
```

### Transações
```bash
POST   /api/transactions/deposit   # Depositar
POST   /api/transactions/withdrawal # Sacar
POST   /api/transactions/transfer  # Transferir
GET    /api/transactions/balance   # Saldo
GET    /api/transactions/history   # Histórico
```

## 📱 Funcionalidades

### Telas
- 🔐 **Login** - Autenticação com email/senha
- ✍️ **Registro** - Criação de conta (individual/conjunta)
- 🏠 **Home** - Dashboard com saldo e ações rápidas
- 💳 **Transações** - Depósito, saque, transferência
- 📋 **Histórico** - Lista completa de operações

### Características
- 🔒 Contas conjuntas com saldo compartilhado
- 🔐 Validação forte de senha
- 🆔 Validação de CPF
- 💰 Quatro métodos de operação (depósito digital/físico, saque, transferência)
- 📊 Histórico paginado
- 🔄 Atualização em tempo real

## 📚 Documentação

- [Backend README](./backend/README.md) - API, endpoints, setup
- [Frontend README](./frontend/README.md) - App mobile, telas, setup
- [BACKLOG.md](./BACKLOG.md) - Tudo implementado na Sprint 1

## 🔐 Segurança

✅ **Implementado:**
- Token JWT com expiração de 1 dia
- Senha criptografada com bcrypt
- Validação de email com @
- CPF com dígito verificador
- Senha forte obrigatória
- Proteção de dados sensíveis
- Token salvo seguramente no device

## 🗂️ Tecnologias

### Backend
- Python 3.8+
- FastAPI
- SQLAlchemy (ORM)
- SQLite
- JWT (python-jose)
- bcrypt

### Frontend
- React Native 0.72
- Expo 49
- TypeScript
- Axios
- React Navigation
- Expo Secure Store

## 🎮 Teste a Aplicação

### Dados de Teste
```
Email: teste@example.com
Senha: Teste@123
CPF: 12345678901
Nome: Teste
```

### Fluxo
1. ✅ Abra o app
2. ✅ Crie uma conta (registre)
3. ✅ Faça login
4. ✅ Veja seu saldo (R$ 0.00)
5. ✅ Clique em "Depositar"
6. ✅ Digite um valor (ex: 100.00)
7. ✅ Confirme a simulação
8. ✅ Saldo atualizado!
9. ✅ Veja transações no histórico

## 📊 Modelos de Dados

### Account
```python
- id: int
- email: str (unique)
- name: str
- cpf: str (unique, validado)
- password_hash: str (bcrypt)
- balance: float
- account_type: "individual" | "joint"
- joint_account_id: int (para conta conjunta)
- created_at: datetime
- is_active: bool
```

### Transaction
```python
- id: int
- account_id: int (FK)
- type: "deposit" | "withdrawal" | "transfer"
- amount: float
- description: str
- sender_account_id: int (para transfers)
- recipient_name: str (para transfers)
- transfer_method: "pix" | "ted" | "doc" (para transfers)
- created_at: datetime
```

## ⚙️ Configuração

### Backend - Alterar URL/Porta

Edite `backend/main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # porta 8001 ao invés de 8000
```

### Frontend - Conectar em API Remota

Edite `frontend/src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://SEU_IP:8000/api';
```

Para device real, use IP local:
```bash
# macOS
ifconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verificar Python
python --version

# Verificar porta 8000 em uso
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -i :8000

# Mudar porta em main.py
```

### Frontend não conecta na API
```bash
# Verificar backend rodando
curl http://localhost:8000/health

# Para device real, usar IP local (não localhost)
# Editar frontend/src/services/api.ts
```

### "ModuleNotFoundError"
```bash
cd backend
source venv/bin/activate  # ou venv\Scripts\activate
pip install -r requirements.txt
```

## 📝 Observações Importantes

- 🎬 Transações no frontend são **simuladas** (apenas demonstração)
- 💾 Backend persiste dados em SQLite (`app.db`)
- 🔐 Contas conjuntas precisam de dois emails diferentes
- ⏰ Token expira em **1 dia**
- 🚫 Não é recomendado usar em produção sem as devidas configurações (SSL, banco real, etc)

## 🚀 Implantação

### ⚠️ Antes de ir ao Vivo
1. Mude `SECRET_KEY` em `backend/app/core/config.py`
2. Use um banco de dados real (PostgreSQL/MySQL)
3. Configure CORS adequadamente (não use `allow_origins=["*"]`)
4. Use HTTPS em produção
5. Configure variáveis de ambiente via `.env`

### Deploy Sugerido
- **Backend**: Heroku, Railway, AWS EC2, DigitalOcean
- **Frontend**: Expo, AWS Amplify, Vercel

## 📞 Suporte

Para dúvidas específicas:
- Backend: Veja [backend/README.md](./backend/README.md)
- Frontend: Veja [frontend/README.md](./frontend/README.md)
- Tudo que foi entregue: Veja [BACKLOG.md](./BACKLOG.md)

## 📄 Licença

Este projeto é fornecido como está para fins educacionais.

---

**Versão**: 1.0.0  
**Sprint**: 1  
**Data**: 11 de abril de 2026  
**Status**: ✅ Pronto para usar

Bora testar! 🚀
