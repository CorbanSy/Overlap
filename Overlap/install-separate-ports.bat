@"
@echo off
echo Installing Overlap app on all emulators with separate ports...
echo.

echo Installing on TestUser1 (port 8081)...
start "TestUser1-Port8081" cmd /k "npx expo run:android --device TestUser1 --port 8081"

echo Waiting 5 seconds before starting next installation...
timeout /t 5 /nobreak

echo Installing on TestUser2 (port 8082)...
start "TestUser2-Port8082" cmd /k "npx expo run:android --device TestUser2 --port 8082"

echo Waiting 5 seconds before starting next installation...
timeout /t 5 /nobreak

echo Installing on TestUser3 (port 8083)...
start "TestUser3-Port8083" cmd /k "npx expo run:android --device TestUser3 --port 8083"

echo.
echo All installations started on separate ports:
echo - TestUser1: http://localhost:8081
echo - TestUser2: http://localhost:8082  
echo - TestUser3: http://localhost:8083
echo.
echo Each emulator will have its own Metro bundler instance.
echo Press any key to exit...
pause > nul
"@ | Out-File -FilePath "install-separate-ports.bat" -Encoding ASCII