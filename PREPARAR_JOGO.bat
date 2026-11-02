@echo off
setlocal
cd /d "%~dp0jogo-corrida"
call npm.cmd ci
if errorlevel 1 goto erro
call npm.cmd run check
if errorlevel 1 goto erro
call npm.cmd run build
if errorlevel 1 goto erro
call npm.cmd test
if errorlevel 1 goto erro
echo.
echo Jogo preparado. A versao online nao depende deste PC ligado.
pause
exit /b 0
:erro
echo.
echo Houve um erro. Copie a mensagem para a IA que esta mantendo o projeto.
pause
exit /b 1
