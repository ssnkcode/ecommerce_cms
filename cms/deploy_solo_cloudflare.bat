@echo off
setlocal
chcp 65001 >nul
title Deploy Cloudflare Pages - saskashop

set "ROOT=%~dp0"

echo ============================================================
echo   DEPLOY CLOUDFLARE PAGES  -  saskashop
echo   Carpeta frontend: %ROOT%
echo ============================================================
echo.

cd /d "%ROOT%"

where node >nul 2>nul
if errorlevel 1 goto :error_node
where npm >nul 2>nul
if errorlevel 1 goto :error_npm

if exist "%ROOT%node_modules" goto :check_backend
echo Instalando dependencias del frontend...
call npm install
if errorlevel 1 goto :error_install_frontend

:check_backend
if exist "%ROOT%..\backend\cms\node_modules" goto :export
echo Instalando dependencias del backend...
pushd "%ROOT%..\backend\cms"
call npm install
popd
if errorlevel 1 goto :error_install_backend

:export
echo Exportando catalogo desde PostgreSQL local...
call node "%ROOT%..\db\export-local-json.mjs"
if errorlevel 1 goto :error_export

echo Compilando el frontend (vite build)...
call npm run build
if errorlevel 1 goto :error_build

echo Verificando proyecto "saskashop" en Cloudflare Pages...
call npx wrangler pages project create saskashop >nul 2>nul

echo Desplegando en Cloudflare Pages (proyecto saskashop)...
call npx wrangler pages deploy "%ROOT%dist" --project-name=saskashop --branch=main --commit-dirty=true
if errorlevel 1 goto :error_deploy

echo ============================================================
echo   DESPLIEGUE EXITOSO
echo   Pagina publicada en: https://saskashop.pages.dev/
echo ============================================================
pause
goto :end

:error_node
echo [ERROR] Node.js no esta instalado o no esta en PATH.
goto :failed

:error_npm
echo [ERROR] npm no esta en PATH.
goto :failed

:error_install_frontend
echo [ERROR] Fallo la instalacion de dependencias del frontend.
goto :failed

:error_install_backend
echo [ERROR] Fallo la instalacion de dependencias del backend.
goto :failed

:error_export
echo [ERROR] No se pudo exportar catalog/data.json.
goto :failed

:error_build
echo [ERROR] Fallo el build del frontend.
goto :failed

:error_deploy
echo ============================================================
echo   [ERROR] Fallo el despliegue. Revisa login, permisos o red.
echo ============================================================

:failed
pause
exit /b 1

:end
endlocal