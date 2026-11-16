@echo off
setlocal

cd /d "%~dp0"
set "JMETER_WEB_PORT_FILE=%~dp0.jmeter-web-port"
set "JMETER_WEB_PORT=58936"
set "NO_OPEN=0"

for %%A in (%*) do (
  if /i "%%~A"=="--no-open" (
    set "NO_OPEN=1"
  ) else (
    set "JMETER_WEB_PORT=%%~A"
  )
)

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

set "JMETER_WEB_URL=http://127.0.0.1:%JMETER_WEB_PORT%/"
>"%JMETER_WEB_PORT_FILE%" echo %JMETER_WEB_PORT%

call :stop_old
if errorlevel 1 (
  echo [JMeter Web UI] Port %JMETER_WEB_PORT% van dang bi chiem, khong the khoi dong server moi.
  pause
  exit /b 1
)

echo [JMeter Web UI] Dang khoi dong server an tai port %JMETER_WEB_PORT%...
rem Chay server o che do an (khong co cua so cmd) de tranh tat nham; log ghi vao .jmeter-web-server.log
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev -- --host :: --port %JMETER_WEB_PORT% --strictPort > .jmeter-web-server.log 2>&1' -WorkingDirectory '%CD%' -WindowStyle Hidden"

for /l %%I in (1,1,30) do (
  call :is_ready
  if not errorlevel 1 goto open_web
  ping -n 2 127.0.0.1 >nul
)

echo [JMeter Web UI] Server khong san sang sau 30 giay.
echo Xem log chi tiet tai: %~dp0.jmeter-web-server.log
type ".jmeter-web-server.log" 2>nul
pause
exit /b 1

:open_web
echo [JMeter Web UI] Server dang chay an. Mo %JMETER_WEB_URL%
echo [JMeter Web UI] Dung server: chay stop-jmeter-web.bat
if "%NO_OPEN%"=="1" exit /b 0
start "" "%JMETER_WEB_URL%"
exit /b 0

:stop_old
rem Dung moi tien trinh node.exe dang chiem port (server cu), roi doi port ranh toi da 10 giay.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%JMETER_WEB_PORT% .*LISTENING"') do (
  tasklist /fi "PID eq %%P" /nh 2>nul | find /i "node.exe" >nul
  if not errorlevel 1 (
    echo [JMeter Web UI] Dung server cu PID %%P...
    taskkill /pid %%P /t /f >nul 2>&1
  ) else (
    tasklist /fi "PID eq %%P" /nh 2>nul | find "%%P" >nul && echo [JMeter Web UI] Port %JMETER_WEB_PORT% dang bi tien trinh khac ^(PID %%P^) chiem, bo qua.
  )
)
for /l %%I in (1,1,10) do (
  netstat -ano | findstr /r /c:":%JMETER_WEB_PORT% .*LISTENING" >nul
  if errorlevel 1 exit /b 0
  ping -n 2 127.0.0.1 >nul
)
exit /b 1

:is_ready
powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri '%JMETER_WEB_URL%'; if ($r.StatusCode -eq 200 -and $r.Content -match '<title>JMeter Web UI</title>') { exit 0 }; exit 1 } catch { exit 1 }"
exit /b %errorlevel%
