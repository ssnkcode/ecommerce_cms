@echo off
setlocal enabledelayedexpansion
title Commerce CMS - Iniciar todo
cd /d "%~dp0"

echo ============================================================
echo   COMMERCE CMS - Lanzador
echo   Inicia: PostgreSQL + API + Frontend + navegador
echo ============================================================
echo.

REM --- Configuracion de rutas (relativas a este .bat) ---
set "BACKEND_DIR=%~dp0backend\cms"
set "FRONTEND_DIR=%~dp0cms"
set "API_PORT=3001"
set "FRONT_PORT=5178"
set "API_URL=http://localhost:%API_PORT%"
set "FRONT_URL=http://localhost:%FRONT_PORT%/catalog/catalog.html"
set "PANEL_URL=http://localhost:%FRONT_PORT%/cms/"

REM ============================================================================
REM 1) Chequear Node.js
REM ============================================================================
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo         Descargalo de https://nodejs.org y reinicia este lanzador.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do set "NODE_VER=%%v"
echo [OK]     Node.js %NODE_VER%

REM npm debe estar disponible
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm no esta en el PATH.
    pause
    exit /b 1
)

REM ============================================================================
REM 2) Chequear/levantar PostgreSQL (servicio local)
REM ============================================================================
if not defined PGCLIENTENCODING set "PGCLIENTENCODING=UTF8"
set "psql_found="
for %%v in (18 17 16 15 14 13) do (
    if not defined psql_found (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" set "psql_found=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
    )
)
if not defined psql_found (
    where psql >nul 2>nul
    if not errorlevel 1 set "psql_found=psql"
)
if defined psql_found (
    echo [OK]     PostgreSQL encontrado: %psql_found%
    REM Levantar el servicio si esta detenido
    for /f "delims=" %%s in ('sc query type=service state=inactive ^| findstr /i "postgresql"') do (
        echo [PG]     Hay un servicio PostgreSQL detenido, intentando iniciarlo...
        sc start postgresql-x64-18 >nul 2>nul
        sc start postgresql-x64-17 >nul 2>nul
        sc start postgresql-x64-16 >nul 2>nul
        sc start postgresql-x64-15 >nul 2>nul
        sc start postgresql-x64-14 >nul 2>nul
        timeout /t 2 /nobreak >nul
        break
    )
) else (
    echo [AVISO]  No se encontro psql en rutas habituales ni en el PATH.
    echo          Si PostgreSQL no esta corriendo, la API fallara al iniciar.
)

REM ============================================================================
REM 3) Crear .env del backend si no existe (desde .env.example)
REM ============================================================================
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy /y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [ENV]    Se creo backend\cms\.env desde .env.example
    ) else (
        echo [AVISO]  No existe backend\cms\.env ni .env.example.
    )
) else (
    echo [OK]     backend\cms\.env presente
)

REM ============================================================================
REM 4) Instalar dependencias si faltan y correr db:init
REM    (el seed es no destructivo: no pisa la contrasena del admin ni duplica
REM     productos si la tabla ya tiene datos)
REM ============================================================================
if not exist "%BACKEND_DIR%\node_modules" (
    echo [NPM]    Instalando dependencias del backend...
    pushd "%BACKEND_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install en backend.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo [OK]     dependencias backend listas
)

REM Inicializar la base de datos (idempotente: no pisa datos si ya existen)
echo [DB]     Inicializando base de datos (db/base_completa.sql)...
pushd "%BACKEND_DIR%"
call npm run db:init
if errorlevel 1 (
    echo [AVISO]  db:init devolvio error. Si la base ya estaba creada y con datos,
    echo          puede ignorarse; la API igual puede levantar. Revisa las credenciales
    echo          de backend\.cms\.env, la variable DATABASE_URL y que el servicio
    echo          PostgreSQL este arriba.
) else (
    echo [OK]     Base de datos lista.
)
popd

REM ============================================================================
REM 5) Instalar dependencias del frontend si faltan
REM ============================================================================
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [NPM]    Instalando dependencias del frontend...
    pushd "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install en frontend.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo [OK]     dependencias frontend listas
)

REM ============================================================================
REM 6) Levantar la API del CMS (ventana propia con logs)
REM ============================================================================
start "Commerce CMS - API" cmd /k "cd /d ""%BACKEND_DIR%"" && npm run dev"
echo [API]    backend arrancando en %API_URL% ...

REM ============================================================================
REM 7) Levantar el frontend (ventana propia con logs)
REM ============================================================================
start "Commerce CMS - Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"
echo [FRONT]  frontend arrancando en http://localhost:%FRONT_PORT% ...

REM ============================================================================
REM 8) Esperar a que respondan la API y el catalogo, y abrir el navegador
REM ============================================================================
echo [CHECK]  esperando a que respondan API y catalogo ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$api='%API_URL%/api/health'; $cat='%FRONT_URL%'; $apiOk=$false; $catOk=$false; for($i=0;$i -lt 120;$i++){ if(-not $apiOk){ try { $r=Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ $apiOk=$true; Write-Host '  [API]    responde' } } catch {} }; if(-not $catOk){ try { $r=Invoke-WebRequest -Uri $cat -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ $catOk=$true; Write-Host '  [CAT]    catalogo responde' } } catch {} }; if($apiOk -and $catOk){ break }; Start-Sleep -Milliseconds 500 }; if($catOk){ Start-Process $cat; Write-Host '[VIEW]  abriendo el catalogo en el navegador' } else { Write-Host '[VIEW]  no se confirmo el frontend; revisa la ventana del frontend' }; if($apiOk){ Write-Host '[OK]  Catalogo en %FRONT_URL%'; Write-Host '[OK]  Panel CMS en %PANEL_URL%'; exit 0 } else { Write-Host '[AVISO] la API no respondio; revisa la ventana API y su .env'; exit 1 }"

echo.
echo  Listo. Deja esta ventana minimizada.
echo  Para detener todo, cerra las ventanas "Commerce CMS - API" y "Commerce CMS - Frontend".
echo.
pause
endlocal