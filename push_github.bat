@echo off
chcp 65001 >nul
title Push a GitHub - saska-shop
echo.
echo ============================================
echo   PUSH A GITHUB
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] git add .
call git add .
if errorlevel 1 (
    echo [ERROR] Fallo git add.
    pause
    exit /b 1
)

echo.
echo [2/3] git commit -m "Update"
call git commit -m "Update"
if errorlevel 1 (
    echo.
    echo   No hay cambios para commitear (o fallo el commit).
    echo   Se continua igual con el push.
)

echo.
echo [3/3] git push -u origin master --force
call git push -u origin master --force
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo el push a GitHub.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   PUSH EXITOSO
echo   Cambios subidos a GitHub.
echo ============================================
echo.
pause