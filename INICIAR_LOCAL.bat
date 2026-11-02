@echo off
setlocal
cd /d "%~dp0jogo-corrida"
if not exist "dist\index.html" (
  echo A versao do jogo ainda nao foi gerada. Execute PREPARAR_JOGO.bat.
  pause
  exit /b 1
)
node scripts\serve.mjs
pause
