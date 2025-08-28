# Simple approach: Start 3 Metro instances manually
Write-Host "Simple 3-Metro setup for multi-user testing" -ForegroundColor Green

# Kill existing processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Clear the ports
foreach ($port in @(8081, 8082, 8083)) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($proc in $processes) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Starting Metro bundlers..." -ForegroundColor Cyan

# Start Metro 1 (TestUser1) - Port 8081
Write-Host "Starting Metro for TestUser1 on port 8081..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "title TestUser1-Metro-8081 && echo === TestUser1 Metro === && npx expo start --port 8081 --clear" -WindowStyle Normal

Start-Sleep -Seconds 10

# Start Metro 2 (TestUser2) - Port 8082  
Write-Host "Starting Metro for TestUser2 on port 8082..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "title TestUser2-Metro-8082 && echo === TestUser2 Metro === && npx expo start --port 8082 --clear" -WindowStyle Normal

Start-Sleep -Seconds 10

# Start Metro 3 (TestUser3) - Port 8083
Write-Host "Starting Metro for TestUser3 on port 8083..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "title TestUser3-Metro-8083 && echo === TestUser3 Metro === && npx expo start --port 8083 --clear" -WindowStyle Normal

Write-Host ""
Write-Host "All Metro bundlers started!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 30-60 seconds for all Metro bundlers to fully start"
Write-Host "2. In each Metro terminal window, press 'a' to install on Android"
Write-Host "3. Or use the QR codes if using Expo Go"
Write-Host ""
Write-Host "Metro URLs:" -ForegroundColor Yellow
Write-Host "  TestUser1: http://localhost:8081"
Write-Host "  TestUser2: http://localhost:8082" 
Write-Host "  TestUser3: http://localhost:8083"
Write-Host ""
Write-Host "Device mapping:" -ForegroundColor Yellow
Write-Host "  emulator-5554 (TestUser1) -> Metro 8081"
Write-Host "  emulator-5556 (TestUser2) -> Metro 8082"
Write-Host "  emulator-5560 (TestUser3) -> Metro 8083"

# Final status check after a delay
Write-Host ""
Write-Host "Checking port status in 15 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "=== Port Status ===" -ForegroundColor Cyan
foreach ($port in @(8081, 8082, 8083)) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "Port ${port}: LISTENING" -ForegroundColor Green
    } else {
        Write-Host "Port ${port}: NOT ACTIVE" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Android Devices ===" -ForegroundColor Cyan
& adb devices