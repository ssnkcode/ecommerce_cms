@echo off
setlocal
chcp 65001 >nul
title Regenerar Catalogo - saska-shop

set "ROOT=%~dp0"

echo.
echo ============================================================
echo   REGENERAR CATALOGO  -  Ctrl+Z del catalogo
echo   Proyecto: saska-shop
echo ============================================================
echo.

cd /d "%ROOT%"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en PATH.
    pause
    exit /b 1
)

echo   Orden de recuperacion:
echo     1) Base de datos PostgreSQL
echo     2) Web publicada en Cloudflare Pages
echo     3) Respaldo local catalog\data.json.bak
echo.
echo   Antes de tocar algo se guarda un respaldo con fecha de
echo   catalog\data.json en catalog\data.json.bak-AAAA-MM-DD.
echo.

call node "%ROOT%db\regenerar-catalogo.mjs"
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo regenerar el catalogo.
    echo         Revisa el mensaje de arriba: base inaccesible, web publicada
    echo         sin responder o sin respaldo local.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Catalogo regenerado. Si lo necesitas, desplega con
echo      deploy_solo_cloudflare.bat para publicarlo.
echo.
echo  Presiona una tecla para cerrar...
pause
endlocal