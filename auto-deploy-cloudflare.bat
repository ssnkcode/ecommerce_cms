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

REM URL de la API de PRODUCCION que usara este build (Vercel).
REM Si cambias el backend de Vercel, actualiza este valor.
set "VITE_API_URL=https://ecommerce-cms-kappa.vercel.app"

cd /d "%ROOT%\cms"

echo.
echo [0/4] Sincronizando datos LOCALES a la base de produccion...
call node "%ROOT%deploy-sync.mjs"
if errorlevel 1 (
    echo.
    echo   [AVISO] No se pudieron sincronizar los datos locales.
    echo           El deploy continua, pero la web mostrara lo que ya esta en produccion.
)

echo.
echo [1/4] Verificando dependencias del frontend...
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
echo [2/4] Compilando el frontend (build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo el build del frontend.
    pause
    exit /b 1
)

echo.
echo [3/4] Desplegando en Cloudflare Pages (saska-shop)...
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