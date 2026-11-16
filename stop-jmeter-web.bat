@echo off
setlocal

cd /d "%~dp0"
set "JMETER_WEB_PORT=58936"
if exist ".jmeter-web-port" set /p JMETER_WEB_PORT=<".jmeter-web-port"
for /f "tokens=* delims= " %%A in ("%JMETER_WEB_PORT%") do set "JMETER_WEB_PORT=%%A"
if not "%~1"=="" set "JMETER_WEB_PORT=%~1"

set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%JMETER_WEB_PORT% .*LISTENING"') do (
  tasklist /fi "PID eq %%P" /nh 2>nul | find /i "node.exe" >nul
  if not errorlevel 1 (
    taskkill /pid %%P /t /f >nul 2>&1 && echo [JMeter Web UI] Dung server PID %%P tai port %JMETER_WEB_PORT%...
    set "FOUND=1"
  )
)

if "%FOUND%"=="0" echo [JMeter Web UI] Khong co server nao dang chay tai port %JMETER_WEB_PORT%.
if "%FOUND%"=="1" echo [JMeter Web UI] Da dung server.
ping -n 3 127.0.0.1 >nul
exit /b 0
