#!/bin/bash

# Script de instalação automática da FinanceApp
# Uso: bash install_all.sh

set -e  # Exit on error

echo "🚀 Iniciando instalação da FinanceApp..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para imprimir seções
section() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Função para sucesso
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Função para erro
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está na pasta correta
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "Este script deve ser executado na raiz do projeto (onde estão as pastas 'backend' e 'frontend')"
    exit 1
fi

# 1. Instalar Node.js (se necessário)
section "1️⃣  VERIFICANDO NODE.JS"

if ! command -v node &> /dev/null; then
    error "Node.js não instalado. Instale de: https://nodejs.org"
    exit 1
else
    success "Node.js $(node --version) encontrado"
fi

# 2. Instalar Python (se necessário)
section "2️⃣  VERIFICANDO PYTHON"

if ! command -v python3 &> /dev/null; then
    error "Python 3 não instalado. Instale de: https://www.python.org"
    exit 1
else
    success "Python $(python3 --version) encontrado"
fi

# 3. Instalar dependências do Frontend
section "3️⃣  INSTALANDO FRONTEND"

cd frontend

if [ -d "node_modules" ]; then
    echo "Limpando node_modules antigos..."
    rm -rf node_modules package-lock.json
fi

echo "Instalando pacotes npm..."
npm install

success "Frontend instalado com sucesso"

cd ..

# 4. Criar virtual environment e instalar Backend
section "4️⃣  INSTALANDO BACKEND"

cd backend

# Criar venv se não existir
if [ ! -d "venv" ]; then
    echo "Criando virtual environment..."
    python3 -m venv venv
fi

# Ativar venv
source venv/bin/activate

# Instalar dependências
echo "Instalando pacotes Python..."
pip install -r requirements.txt

success "Backend instalado com sucesso"

cd ..

# 5. Verificar PostgreSQL
section "5️⃣  VERIFICANDO POSTGRESQL"

if ! command -v psql &> /dev/null; then
    error "PostgreSQL não encontrado. Instale em: https://www.postgresql.org/download"
    exit 1
else
    success "PostgreSQL encontrado"
fi

# 6. Criar banco de dados (opcional)
read -p "Deseja criar o banco de dados 'financeapp'? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "Criando banco de dados..."
    
    PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE financeapp;" 2>/dev/null || \
    success "Banco 'financeapp' criado (ou já existe)"
fi

# 7. Instruções finais
section "🎉 INSTALAÇÃO CONCLUÍDA!"

echo -e "${GREEN}Próximos passos:${NC}\n"

echo "1️⃣  Configure a URL da API:"
echo "   Arquivo: frontend/src/config.ts"
echo "   Linha: const API_BASE_URL = 'http://SEU_IP:8000/api'"
echo ""

echo "2️⃣  Configure o banco de dados (se necessário):"
echo "   Arquivo: backend/.env"
echo "   Altere DB_PASSWORD para a sua senha PostgreSQL"
echo ""

echo "3️⃣  Leia as instruções detalhadas:"
echo "   cat AJUSTES.md"
echo ""

echo "4️⃣  Inicie o backend (terminal 1):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""

echo "5️⃣  Inicie o frontend (terminal 2):"
echo "   cd frontend"
echo "   npm start"
echo ""

echo -e "${GREEN}Boa sorte! 🚀${NC}\n"
