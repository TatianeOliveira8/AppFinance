# 🐘 Setup PostgreSQL - FinanceApp

## 📋 Pré-requisitos

Antes de rodar a aplicação, você precisa ter **PostgreSQL** instalado e configurado.

---

## 🖥️ Instalação por Sistema Operacional

### Linux (Ubuntu/Debian)

```bash
# 1. Instalar PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# 2. Iniciar o serviço
sudo service postgresql start

# 3. Verificar se está rodando
sudo service postgresql status

# 4. Acessar o PostgreSQL
sudo -u postgres psql

# 5. Dentro do psql, criar o banco de dados
CREATE DATABASE financeapp;
CREATE USER financeapp_user WITH PASSWORD 'senha_segura';
ALTER ROLE financeapp_user SET client_encoding TO 'utf8';
ALTER ROLE financeapp_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE financeapp_user SET default_transaction_deferrable TO on;
ALTER ROLE financeapp_user SET default_transaction_read_uncommitted TO off;
GRANT ALL PRIVILEGES ON DATABASE financeapp TO financeapp_user;
\q

# 6. Sair do psql
exit
```

### Windows

```powershell
# 1. Baixar PostgreSQL em: https://www.postgresql.org/download/windows/
# 2. Executar instalador e seguir os passos
# 3. Anotar a senha do usuário "postgres" que você criar
# 4. Abrir "SQL Shell (psql)"
# 5. Digite "localhost", "5432", "postgres" (user padrão)
# 6. Digite sua senha
# 7. Executar os mesmos comandos SQL acima:

CREATE DATABASE financeapp;
CREATE USER financeapp_user WITH PASSWORD 'senha_segura';
ALTER ROLE financeapp_user SET client_encoding TO 'utf8';
ALTER ROLE financeapp_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE financeapp_user SET default_transaction_deferrable TO on;
ALTER ROLE financeapp_user SET default_transaction_read_uncommitted TO off;
GRANT ALL PRIVILEGES ON DATABASE financeapp TO financeapp_user;
\q
```

### macOS (com Homebrew)

```bash
# 1. Instalar PostgreSQL
brew install postgresql

# 2. Iniciar o serviço
brew services start postgresql

# 3. Criar o banco de dados
createdb financeapp

# 4. Criar usuário (optional)
psql financeapp -c "CREATE USER financeapp_user WITH PASSWORD 'senha_segura';"
psql financeapp -c "GRANT ALL PRIVILEGES ON DATABASE financeapp TO financeapp_user;"

# 5. Verificar
psql financeapp -c "SELECT version();"
```

---

## 🔧 Configuração no Backend

### 1. Arquivo `.env`

O arquivo `.env` já foi criado com valores padrão. Se você usou outras credenciais, **edite** o `.env`:

```bash
cd backend
nano .env  # ou abra em seu editor
```

Altere conforme necessário:

```env
DB_USER=financeapp_user      # ou "postgres" se usar user padrão
DB_PASSWORD=senha_segura     # sua senha
DB_HOST=localhost            # ou outra máquina
DB_PORT=5432                 # porta padrão do PostgreSQL
DB_NAME=financeapp           # nome do banco
```

### 2. Instalação de Dependências

```bash
cd backend

# Criar ambiente virtual (se ainda não existir)
python3 -m venv venv

# Ativar ambiente
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate     # Windows

# Instalar dependências (inclui psycopg2-binary e python-dotenv)
pip install -r requirements.txt
```

### 3. Testar Conexão

```bash
# Enquanto ainda no ambiente virtual:
python3 -c "from app.database import engine; print(engine.execute('SELECT 1'))"
```

Se funcionar, verá algo como resultado. Se falhar, pode ser:

- **Erro de conexão**: PostgreSQL não está rodando
- **Erro de senha**: Verifique `.env` e credenciais no PostgreSQL
- **Erro de banco não existe**: Execute `CREATE DATABASE financeapp;` novamente

---

## 🚀 Rodar a Aplicação

### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # macOS/Linux ou venv\Scripts\activate no Windows
python main.py

# Deve exibir:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

**O banco de dados será criado automaticamente** na primeira execução!

### Terminal 2 - Frontend

```bash
cd frontend
npm install  # se ainda não instalou
npm start

# Depois aperte:
# 'a' para rodar no Android Emulator
# 'i' para rodar no iOS Simulator
# 'w' para rodar na web
```

---

## ✅ Verificações

### ✓ PostgreSQL está rodando?

```bash
# Linux/Mac
sudo service postgresql status

# Windows: Procure por "Services" > PostgreSQL
```

### ✓ Banco de dados foi criado?

```bash
psql -U postgres -c "\l"
# Procure por "financeapp" na lista
```

### ✓ Backend está funcionando?

```bash
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy"}
```

### ✓ Frontend conecta no backend?

- Abra em seu celular/emulador e tente fazer login
- Se funcionar, tudo está certo!

---

## 🆘 Problemas Comuns

### ❌ "psycopg2.OperationalError: could not translate host name"

**Causa**: PostgreSQL não está rodando ou `DB_HOST` está errado

**Solução**:
```bash
# Verifique se PostgreSQL está rodando
sudo service postgresql status

# Se não estiver, inicie
sudo service postgresql start

# Verifique DB_HOST em .env (deve ser "localhost")
```

### ❌ "password authentication failed"

**Causa**: Senha no `.env` está errada

**Solução**:
```bash
# Resetar senha do "postgres"
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'nova_senha';
\q

# Mudar no .env
DB_PASSWORD=nova_senha
```

### ❌ "database "financeapp" does not exist"

**Causa**: Banco não foi criado

**Solução**:
```bash
psql -U postgres
CREATE DATABASE financeapp;
\q
```

### ❌ "ModuleNotFoundError: No module named 'psycopg2'"

**Causa**: Dependência não foi instalada

**Solução**:
```bash
source venv/bin/activate
pip install psycopg2-binary python-dotenv
```

---

## 📚 Referências

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **SQLAlchemy + PostgreSQL**: https://docs.sqlalchemy.org/en/20/dialects/postgresql.html
- **Psycopg2**: https://www.psycopg.org/

---

## 🎯 Resumo Rápido

```bash
# 1. Instalar PostgreSQL (veja acima)
# 2. Criar banco: createdb financeapp
# 3. Backend:
cd backend && source venv/bin/activate && pip install -r requirements.txt && python main.py

# 4. Frontend (outro terminal):
cd frontend && npm install && npm start
```

**Pronto! 🎉**

---

*Criado em 11 de abril de 2026*
