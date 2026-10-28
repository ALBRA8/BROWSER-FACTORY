@echo off
title Browser Factory
cd /d "%~dp0app"

:: Si ya esta corriendo en el puerto 3300, solo abrir la web y salir
netstat -aon | findstr ":3300" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    start http://127.0.0.1:3300
    exit /b
)

:: Iniciar servidor y abrir navegador
start http://127.0.0.1:3300
node server.mjs
exit /b
