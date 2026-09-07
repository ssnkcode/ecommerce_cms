@echo off
chcp 65001 >nul
title Push a GitHub - saska-shop
setlocal
set "GIT_TERMINAL_PROMPT=0"

REM Log con el detalle de todo lo que lanzo
set "LOG=%TEMP%\push_github.log"
if exist "%LOG%" del "%LOG%"

echo.
echo ============================================
echo   PUSH A GITHUB
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] git add .  >> "%LOG%"
git add . >> "%LOG%" 2>&1
set "ADD_ERR=%ERRORLEVEL%"

echo [2/3] git commit -m "Update"  >> "%LOG%"
git commit -m "Update" >> "%LOG%" 2>&1
set "COMMIT_ERR=%ERRORLEVEL%"

echo [3/3] git push -u origin master --force  >> "%LOG%"
git push -u origin master --force >> "%LOG%" 2>&1
set "PUSH_ERR=%ERRORLEVEL%"

echo.
echo ============================================
if "%PUSH_ERR%"=="0" (
    echo   PUSH EXITOSO
    echo   Cambios subidos a GitHub.
) else (
    echo   [ERROR] Fallo el push a GitHub.
    echo   Revisa el detalle aca abajo.
)
echo ============================================
echo.

echo --- Detalle completo de cada comando ---
echo.
type "%LOG%"

echo.
echo.
echo Presione una tecla para cerrar . . .
pause >nul