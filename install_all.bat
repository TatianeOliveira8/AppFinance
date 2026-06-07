@echo off
REM Script de instalação automática da FinanceApp para Windows
REM Uso: install_all.bat

setlocal enabledelayedexpansion

echo.
echo ============================================
echo   FinanceApp - Instalacao Automatica
echo ============================================
echo.

REM Verificar se está na pasta correta
if not exist "backend" (
    echo ERRO: Pasta 'backend' nao encontrada!
    echo Este script deve ser executado na raiz do projeto.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERRO: Pasta 'frontend' nao encontrada!
    echo Este script deve ser executado na raiz do projeto.
    pause
    exit /b 1
)

REM 1. Verificar Node.js
echo.
echo [1] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao instalado!
    echo Baixe em: https://nodejs.org
    pause
    exit /b 1
) else (
    echo OK: Node.js encontrado
)

REM 2. Verificar Python
echo.
echo [2] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao instalado!
    echo Baixe em: https://www.python.org
    pause
    exit /b 1
) else (
    echo OK: Python encontrado
)

REM 3. Instalar Frontend
echo.
echo [3] Instalando dependencias do Frontend...
cd frontend

if exist "node_modules" (
    echo Limpando node_modules antigos...
    rmdir /s /q node_modules >nul 2>&1
    del package-lock.json >nul 2>&1
)

echo Instalando pacotes npm...
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar frontend!
    pause
    exit /b 1
)

echo OK: Frontend instalado
cd ..

REM 4. Instalar Backend
echo.
echo [4] Instalando dependencias do Backend...
cd backend

if not exist "venv" (
    echo Criando virtual environment...
    python -m venv venv
)

REM Ativar venv
call venv\Scripts\activate.bat

echo Instalando pacotes Python...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar backend!
    pause
    exit /b 1
)

echo OK: Backend instalado
cd ..

REM 5. Verificar PostgreSQL
echo.
echo [5] Verificando PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo AVISO: PostgreSQL nao encontrado!
    echo Baixe em: https://www.postgresql.org/download
    echo.
    echo Voce precisara configurar manualmente o banco de dados.
) else (
    echo OK: PostgreSQL encontrado
)

REM 6. Instruções finais
echo.
echo ============================================
echo   INSTALACAO CONCLUIDA!
echo ============================================
echo.
echo PROXIMOS PASSOS:
echo.
echo 1) Configure a URL da API:
echo    Arquivo: frontend\src\config.ts
echo    Linha: const API_BASE_URL = 'http://SEU_IP:8000/api'
echo.
echo 2) Configure o banco de dados (se necessario):
echo    Arquivo: backend\.env
echo    Altere DB_PASSWORD para sua senha PostgreSQL
echo.
echo 3) Leia as instrucoes detalhadas:
echo    AJUSTES.md
echo.
echo 4) Inicie o backend (terminal 1):
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python main.py
echo.
echo 5) Inicie o frontend (terminal 2):
echo    cd frontend
echo    npm start
echo.
echo Boa sorte! 
echo.
pause
