@echo off
chcp 65001 >nul
title Commerce CMS - Iniciar Catalogo
echo.
echo ============================================
echo   COMMERCE CMS - Iniciando backend y catalogo
echo ============================================
echo.

set "ROOT=%~dp0"
set "FOUND="

if exist "%ROOT%backend\cms\package.json" set "FOUND=1"

if not defined FOUND (
    if exist "D:\upc\cms\backend\cms\package.json" set "ROOT=D:\upc\cms\"
    if exist "F:\upc\cms\backend\cms\package.json" set "ROOT=F:\upc\cms\"
)

if not exist "%ROOT%\backend\cms\node_modules" (
    echo [1/2] Instalando dependencias del backend...
    cd /d "%ROOT%\backend\cms"
    call npm install
)

if not exist "%ROOT%\cms\node_modules" (
    echo [2/2] Instalando dependencias del frontend...
    cd /d "%ROOT%\cms"
    call npm install
)

cd /d "%ROOT%"

echo.
echo --------------------------------------------
echo   Levantando backend (puerto 3001)...
echo --------------------------------------------
start "CMS Backend" cmd /k "cd /d "%ROOT%backend\cms" && node server.mjs"

echo   Esperando 3 segundos a que arranque el backend...
timeout /t 3 /nobreak >nul

echo --------------------------------------------
echo   Levantando frontend (puerto 5178)...
echo --------------------------------------------
start "CMS Frontend" cmd /k "cd /d "%ROOT%cms" && npx vite --open http://localhost:5178/catalog/catalog.html"

echo.
echo ============================================
echo   TODO LEVANTADO
echo   Backend  : http://localhost:3001/api/health
echo   Catalogo : http://localhost:5178/catalog/catalog.html
echo   Panel CMS: http://localhost:5178/cms/
echo ============================================
echo.
echo   El catalogo abre con los datos de la base local.
echo   Para editarlos, entra al Panel CMS o usa el backend local y luego
echo   deploy_solo_cloudflare.bat para publicar el frontend.
echo.
echo   Para apagar, cerrar las ventanas del backend y frontend.
echo.
pause