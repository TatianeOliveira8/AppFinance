@echo off
REM Script de atalho para compilar no Windows
REM Use: compilar.bat

cd /d "%~dp0"
python compila.py %*
pause
