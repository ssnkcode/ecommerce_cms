@echo off
setlocal
title Commerce CMS - Iniciar todo
cd /d "%~dp0"

echo ============================================================
echo   COMMERCE CMS - Lanzador
echo   Inicia: PostgreSQL (si hace falta) + API + Frontend + navegador
echo ============================================================
echo.

REM --- 1) Chequear Node.js ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo No se puede continuar.
    pause
    exit /b 1
)

REM --- 2) Asegurarse de que PostgreSQL este corriendo ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $s = Get-Service -Name 'postgres*' | Select-Object -First 1; if (-not $s) { Write-Host '[PostgreSQL] servicio no encontrado - revisa que este instalado' } elseif ($s.Status -eq 'Running') { Write-Host '[PostgreSQL] ya esta corriendo' } else { Start-Service $s.Name -ErrorAction Stop; Write-Host ('[PostgreSQL] iniciado: ' + $s.Name) } } catch { Write-Host ('[PostgreSQL] no se pudo iniciar: ' + $_.Exception.Message) }"

REM --- 3) Levantar la API del CMS (ventana propia con logs) ---
start "Commerce CMS - API" cmd /k "cd /d F:\upc\cms\backend\cms && npm run dev"
echo [API]    backend arrancando en http://localhost:3001 ...

REM --- 4) Levantar el frontend (ventana propia con logs) ---
start "Commerce CMS - Frontend" cmd /k "cd /d F:\upc\cms\cms && npm run dev"
echo [FRONT]  frontend arrancando en http://localhost:5178 ...

REM --- 5) Esperar a que el frontend responda y abrir el navegador ---
echo [VIEW]   esperando que responda el frontend ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:5178/cms/' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {}; Start-Sleep -Milliseconds 500 }; if($ok){ Start-Process 'http://localhost:5178/cms/'; Write-Host '[VIEW]  abriendo el navegador en el panel CMS' } else { Write-Host '[VIEW]  avisa: no se pudo confirmar el frontend, revisa las ventanas' }"

echo.
echo  Listo. Deja esta ventana minimizada.
echo  Para detener todo, cerra las ventanas "Commerce CMS - API" y "Commerce CMS - Frontend".
echo.
pause
endlocal