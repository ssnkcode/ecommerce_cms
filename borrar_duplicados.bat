@echo off
setlocal
chcp 65001 >nul
title Borrar Duplicados - saska-shop

set "ROOT=%~dp0"

echo.
echo ============================================================
echo   BORRAR PRODUCTOS DUPLICADOS
echo   Proyecto: saska-shop
echo ============================================================
echo.
echo   Conserva una sola fila por titulo (la mas reciente) y
echo   elimina las copias extra de la base de datos.
echo.

cd /d "%ROOT%"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en PATH.
    pause
    exit /b 1
)

call node "%ROOT%db\dedupe-products.mjs"
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la limpieza de duplicados.
    echo         Revisa el mensaje de error de arriba: acceso a la base o DATABASE_URL.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Duplicados revisados. Luego de borrar, se regenera catalog/data.json
echo      para que el catalogo local quede sincronizado...
call node "%ROOT%db\export-local-json.mjs"

echo.
echo  Presiona una tecla para cerrar...
pause
endlocal