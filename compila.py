#!/usr/bin/env python3
"""
Compila.py - Script para criar backup do projeto FinanceApp

Remove arquivos grandes e desnecessários (node_modules, venv, __pycache__)
e compacta tudo em um ZIP pronto para enviar/salvar.

Uso:
    python3 compila.py          # Cria Salva_Amiga.zip na pasta atual
    python3 compila.py /caminho # Cria ZIP em /caminho
"""

import os
import sys
import zipfile
import shutil
from pathlib import Path
from datetime import datetime

# Configurações
PROJECT_NAME = "FinanceApp"
ZIP_NAME = "Salva_Amiga.zip"
IGNORED_DIRS = {
    "node_modules",      # Dependências npm (muito grande ~300MB)
    "venv",              # Ambiente virtual Python (~200MB)
    "env",               # Outro nome possível de venv
    "__pycache__",       # Cache Python
    ".pytest_cache",     # Cache pytest
    ".expo",             # Cache Expo
    "dist",              # Builds
    "build",             # Builds
    ".gradle",           # Android cache
    ".idea",             # IDE
    ".vscode",           # VS Code settings locais
    "android/.gradle",   # Gradle cache
    "ios/Pods",          # CocoaPods cache
}

IGNORED_FILES = {
    ".env",              # Variáveis de ambiente (segurança)
    ".env.local",        # Variáveis locais
    "app.db",            # Banco de dados (deixa vazio)
    "package-lock.json", # Será recriado com npm install
    "yarn.lock",         # Será recriado com yarn install
    ".DS_Store",         # macOS
    "Thumbs.db",         # Windows
    "*.log",             # Logs
}

IGNORED_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".egg-info",
    ".swp",
    ".swo",
    ".tmp",
}

# Extensões que SEMPRE devem ser incluídas (mesmo em pastas ignoradas)
ALWAYS_INCLUDE_EXTENSIONS = {
    ".md",  # Documentação
}


def should_ignore(path_str, is_dir=False):
    """Verifica se o caminho deve ser ignorado"""
    path = Path(path_str)
    name = path.name
    
    # SEMPRE incluir certos arquivos (ex: .md)
    if path.suffix.lower() in ALWAYS_INCLUDE_EXTENSIONS:
        return False
    
    # Verificar diretórios ignorados
    if is_dir and name in IGNORED_DIRS:
        return True
    
    # Verificar caminho relativo contém diretórios ignorados
    for ignored_dir in IGNORED_DIRS:
        if ignored_dir in path.parts:
            return True
    
    # Verificar arquivos ignorados
    if name in IGNORED_FILES:
        return True
    
    # Verificar extensões ignoradas
    if path.suffix.lower() in IGNORED_EXTENSIONS:
        return True
    
    # Verificar padrão de extensão ignorada
    for ignored_ext in IGNORED_EXTENSIONS:
        if name.endswith(ignored_ext):
            return True
    
    return False


def get_project_root():
    """Encontra a raiz do projeto (onde está BACKLOG.md)"""
    current = Path.cwd()
    
    # Se estiver em um nível diferente, tenta encontrar
    while current.parent != current:
        if (current / "BACKLOG.md").exists():
            return current
        if (current / "backend").exists() and (current / "frontend").exists():
            return current
        current = current.parent
    
    return Path.cwd()


def scan_files(root_path):
    """
    Escaneia todos os arquivos do projeto
    Retorna lista de arquivos a incluir no ZIP
    """
    files_to_include = []
    total_size = 0
    ignored_size = 0
    
    for root, dirs, files in os.walk(root_path):
        # Modificar dirs in place para pular estrutura de diretórios
        dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d), is_dir=True)]
        
        for file in files:
            file_path = Path(root) / file
            
            # Ignora arquivos especificados
            if should_ignore(file_path):
                try:
                    ignored_size += file_path.stat().st_size
                except:
                    pass
                continue
            
            files_to_include.append(file_path)
            try:
                total_size += file_path.stat().st_size
            except:
                pass
    
    return files_to_include, total_size, ignored_size


def create_zip(root_path, output_path, files_list):
    """Cria arquivo ZIP com os arquivos"""
    try:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in files_list:
                # Caminho relativo dentro do ZIP
                relative_path = file_path.relative_to(root_path)
                arcname = f"{PROJECT_NAME}/{relative_path}"
                
                try:
                    zipf.write(file_path, arcname)
                    print(f"  ✓ {arcname}")
                except Exception as e:
                    print(f"  ⚠ Erro ao adicionar {arcname}: {e}")
                    continue
        
        return True
    except Exception as e:
        print(f"Erro ao criar ZIP: {e}")
        return False


def format_size(bytes_size):
    """Formata tamanho em bytes para MB/GB"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.2f} TB"


def main():
    print("\n" + "="*60)
    print(f"  🚀 {PROJECT_NAME} - Compilador de Backup")
    print("="*60)
    
    # Determinar caminhos
    if len(sys.argv) > 1:
        output_dir = Path(sys.argv[1])
        if not output_dir.exists():
            print(f"\n❌ Caminho não existe: {output_dir}")
            return False
    else:
        output_dir = Path.cwd()
    
    project_root = get_project_root()
    output_path = output_dir / ZIP_NAME
    
    print(f"\n📁 Raiz do Projeto: {project_root}")
    print(f"📦 Saída: {output_path}")
    
    # Verificar se já existe
    if output_path.exists():
        print(f"\n⚠️  {ZIP_NAME} já existe!")
        response = input("Deseja sobrescrever? (s/n): ").strip().lower()
        if response != 's':
            print("❌ Operação cancelada")
            return False
        output_path.unlink()
    
    # Escanear arquivos
    print("\n🔍 Escaneando arquivos...")
    files_to_include, total_size, ignored_size = scan_files(project_root)
    
    print(f"  ✓ Arquivos encontrados: {len(files_to_include)}")
    print(f"  ✓ Tamanho total: {format_size(total_size)}")
    print(f"  ✓ Tamanho ignorado: {format_size(ignored_size)}")
    print(f"  ✓ Economia: {format_size(ignored_size)}")
    
    # Criar ZIP
    print(f"\n📦 Criando {ZIP_NAME}...")
    success = create_zip(project_root, output_path, files_to_include)
    
    if success:
        zip_size = output_path.stat().st_size
        print(f"\n✅ Sucesso!")
        print(f"   Arquivo: {output_path}")
        print(f"   Tamanho final: {format_size(zip_size)}")
        print(f"\n📋 Conteúdo incluído:")
        print(f"   ✓ Backend (FastAPI + Python)")
        print(f"   ✓ Frontend (React Native + Expo)")
        print(f"   ✓ Documentação:")
        print(f"     - README.md (principal)")
        print(f"     - backend/README.md")
        print(f"     - frontend/README.md")
        print(f"     - BACKLOG.md")
        print(f"     - ROTEIRO.md")
        print(f"     - POSTGRES_SETUP.md")
        print(f"     - SETUP_COMPLETO.md")
        print(f"     - MUDANCAS_REALIZADAS.md")
        print(f"     - USANDO_COMPILA.md")
        print(f"     - RESUMO_COMPILA.md")
        print(f"\n📋 Conteúdo EXCLUÍDO:")
        print(f"   ✗ node_modules/ (instale com: npm install)")
        print(f"   ✗ venv/ (instale com: python -m venv venv && source venv/bin/activate)")
        print(f"   ✗ __pycache__/ (gerado automaticamente)")
        print(f"   ✗ .env (configure com suas variáveis)")
        print(f"   ✗ app.db (banco de dados - será criado)")
        print(f"\n🚀 Para usar o projeto depois:")
        print(f"   1. Extraer o ZIP")
        print(f"   2. cd backend")
        print(f"   3. python -m venv venv")
        print(f"   4. source venv/bin/activate  # ou venv\\Scripts\\activate no Windows")
        print(f"   5. pip install -r requirements.txt")
        print(f"   6. python main.py")
        print(f"   \n   Em outro terminal:")
        print(f"   7. cd frontend")
        print(f"   8. npm install")
        print(f"   9. npm start")
        print("\n" + "="*60 + "\n")
        return True
    else:
        print(f"\n❌ Erro ao criar {ZIP_NAME}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
