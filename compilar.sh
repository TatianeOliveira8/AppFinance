#!/bin/bash

# Script de atalho para compilar o projeto
# Use: ./compilar.sh

cd "$(dirname "$0")"
python3 compila.py "$@"
