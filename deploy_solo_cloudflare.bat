@echo off
setlocal
chcp 65001 >nul
title Deploy Cloudflare Pages - saska-shop

REM ============================================================================
REM  DEPLOY SOLO CLOUDFLARE - saska-shop
REM  ----------------------------------------------------------------------------
REM  Flujo de publicacion "local-first":
REM    1) Importa el catalogo desde la base PostgreSQL a catalog/data.json
REM       (prebuild = db/export-local-json.mjs).
REM    2) Compila la aplicacion (vite build en cms/).
REM    3) Sincroniza la salida de build hacia la carpeta .\dist.
REM    4) Despliega .\dist en Cloudflare Pages (proyecto saska-shop).
REM  Portabilidad total: todas las rutas se resuelven contra %~dp0 (carpeta de
REM  este script), por lo que funciona en cualquier disco o carpeta.
REM ============================================================================

set "ROOT=%~dp0"

echo.
echo ============================================================
echo   DEPLOY SOLO CLOUDFLARE PAGES
echo   Proyecto: saska-shop
echo   Carpeta : %ROOT%
echo ============================================================
echo.

cd /d "%ROOT%"

REM ----------------------------------------------------------------------------
REM 0) Chequear Node.js y npm
REM ----------------------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en PATH.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do set "NODE_VER=%%v"
echo [OK]     Node.js %NODE_VER%

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm no esta en PATH.
    pause
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 1) Dependencias de la raiz (aplica el prebuild de exportacion)
REM ----------------------------------------------------------------------------
echo.
echo [1/5] Verificando dependencias de la raiz...
if not exist "%ROOT%node_modules" (
    echo       No existen, instalando...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias de la raiz.
        pause
        exit /b 1
    )
) else (
    echo       node_modules presentes, omitiendo npm install.
)

REM ----------------------------------------------------------------------------
REM 2) Dependencias del frontend (vite, react) y del backend (pg para la export)
REM ----------------------------------------------------------------------------
echo.
echo [2/5] Verificando dependencias del frontend (cms)...
if not exist "%ROOT%cms\node_modules" (
    echo       No existen, instalando...
    pushd "%ROOT%cms"
    call npm install
    set "npm_rc=%errorlevel%"
    popd
    if not "%npm_rc%"=="0" (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias del frontend.
        pause
        exit /b 1
    )
) else (
    echo       node_modules presentes, omitiendo npm install.
)

echo.
echo       Verificando dependencias del backend (backend/cms)...
if not exist "%ROOT%backend\cms\node_modules" (
    echo       No existen, instalando...
    pushd "%ROOT%backend\cms"
    call npm install
    set "npm_rc=%errorlevel%"
    popd
    if not "%npm_rc%"=="0" (
        echo.
        echo [AVISO] Fallo la instalacion de dependencias del backend.
        echo         La exportacion usara catalog/data.json previo si existe.
    )
) else (
    echo       node_modules presentes, omitiendo npm install.
)

REM ----------------------------------------------------------------------------
REM 3) URL de la API de PRODUCCION que usara este build (Vercel).
REM    Si cambias el backend de Vercel, actualiza este valor.
REM ----------------------------------------------------------------------------
set "VITE_API_URL=https://ecommerce-cms-kappa.vercel.app"

REM ----------------------------------------------------------------------------
REM 4) Exportar JSON (prebuild) + compilar la aplicacion
REM ----------------------------------------------------------------------------
echo.
echo [3/5] Exportando catalogo desde PostgreSQL y compilando (build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la exportacion y/o el build del frontend.
    echo         Revisa el mensaje de error de arriba y reintenta.
    pause
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 5) Sincronizar la salida del build hacia .\dist (origen del deploy)
REM ----------------------------------------------------------------------------
echo.
echo [4/5] Sincronizando cms\dist hacia .\dist...
robocopy "%ROOT%cms\dist" "%ROOT%dist" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
    echo.
    echo [ERROR] No se pudo sincronizar la carpeta de salida .\dist.
    pause
    exit /b 1
)
echo       Salida lista en %ROOT%dist

REM ----------------------------------------------------------------------------
REM 6) Desplegar en Cloudflare Pages
REM ----------------------------------------------------------------------------
set "DEPLOY_LOG=%ROOT%.deploy-log.txt"
echo.
echo [5/5] Desplegando en Cloudflare Pages (saska-shop)...
call npx wrangler pages deploy "%ROOT%dist" --project-name=saska-shop --commit-dirty=true > "%DEPLOY_LOG%" 2>&1
set "deploy_rc=%errorlevel%"

if exist "%DEPLOY_LOG%" (
    type "%DEPLOY_LOG%"
    echo.
)

if not "%deploy_rc%"=="0" (
    echo ============================================================
    echo   [ERROR] Fallo el despliegue en Cloudflare Pages.
    echo   Revisa la salida de wrangler de arriba: login, permisos o red.
    echo ============================================================
    goto :fin
)

echo ============================================================
echo   DESPLIEGUE EXITOSO: el catalogo se subio correctamente.
echo ============================================================
set "SITE_URL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$t = Get-Content -LiteralPath '%DEPLOY_LOG%' -Raw; if ($t -match 'https://[A-Za-z0-9_.-]+\.pages\.dev') { $matches[0] }"`) do set "SITE_URL=%%u"
if not defined SITE_URL set "SITE_URL=https://saska-shop.pages.dev/"
echo.
echo   Pagina publicada en: %SITE_URL%
echo ============================================================

if exist "%DEPLOY_LOG%" del "%DEPLOY_LOG%" >nul 2>&1

:fin
echo.
echo  Presiona una tecla para cerrar...
pause >nul
endlocal