@echo off
setlocal

cd /d "%~dp0"
set "JMETER_WEB_PORT_FILE=%~dp0.jmeter-web-port"
set "JMETER_WEB_PORT="

where node >nul 2>&1
if errorlevel 1 (
  echo [JMeter Web UI] Khong tim thay Node.js.
  echo Hay cai Node.js 20 tro len, sau do chay lai file nay.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [JMeter Web UI] Dang cai dependencies...
  call npm install
  if errorlevel 1 (
    echo [JMeter Web UI] npm install that bai.
    pause
    exit /b 1
  )
)

if exist "%JMETER_WEB_PORT_FILE%" set /p JMETER_WEB_PORT=<"%JMETER_WEB_PORT_FILE%"
if defined JMETER_WEB_PORT (
  set "JMETER_WEB_URL=http://127.0.0.1:%JMETER_WEB_PORT%/"
  call :is_ready
  if not errorlevel 1 goto open_web
)

for /f %%P in ('powershell -NoProfile -Command ^
  "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop(); Write-Output $port"') do set "JMETER_WEB_PORT=%%P"

if not defined JMETER_WEB_PORT (
  echo [JMeter Web UI] Khong tim duoc port trong.
  pause
  exit /b 1
)

set "JMETER_WEB_URL=http://127.0.0.1:%JMETER_WEB_PORT%/"
>"%JMETER_WEB_PORT_FILE%" echo %JMETER_WEB_PORT%

echo [JMeter Web UI] Dang khoi dong server tai port %JMETER_WEB_PORT%...
start "JMeter Web UI Server" /min cmd /c "npm run dev -- --host 127.0.0.1 --port %JMETER_WEB_PORT% --strictPort"

for /l %%I in (1,1,30) do (
  call :is_ready
  if not errorlevel 1 goto open_web
  ping -n 2 127.0.0.1 >nul
)

echo [JMeter Web UI] Server khong san sang sau 30 giay.
echo Kiem tra cua so "JMeter Web UI Server" de xem loi chi tiet.
pause
exit /b 1

:open_web
echo [JMeter Web UI] Mo %JMETER_WEB_URL%
if /i "%~1"=="--no-open" exit /b 0
start "" "%JMETER_WEB_URL%"
exit /b 0

:is_ready
powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri '%JMETER_WEB_URL%'; if ($r.StatusCode -eq 200 -and $r.Content -match '<title>JMeter Web UI</title>') { exit 0 }; exit 1 } catch { exit 1 }"
exit /b %errorlevel%
