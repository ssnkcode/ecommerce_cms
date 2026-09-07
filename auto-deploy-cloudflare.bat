@echo off
chcp 65001 >nul
title Auto-Deploy Cloudflare - saska-shop
echo.
echo ============================================
echo   AUTO-DEPLOY CLOUDFLARE PAGES
echo   Proyecto: saska-shop
echo ============================================
echo.

set "ROOT=%~dp0"

cd /d "%ROOT%\cms"

echo [1/3] Verificando dependencias del frontend...
if not exist "node_modules" (
    echo   Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Compilando el frontend (build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo el build del frontend.
    pause
    exit /b 1
)

echo.
echo [3/3] Desplegando en Cloudflare Pages (saska-shop)...
call npx wrangler pages deploy "%ROOT%\cms\dist" --project-name=saska-shop
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo el despliegue.
) else (
    echo.
    echo ============================================
    echo   DESPLIEGUE EXITOSO
    echo   https://saska-shop.pages.dev/
    echo ============================================
)

echo.
pause
