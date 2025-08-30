# Multi-Metro Launcher for DEV CLIENT
# Save as: multi-metro.ps1

$ErrorActionPreference = 'Continue'
Write-Host "=== Multi-Metro Launcher for Dev Client ===" -ForegroundColor Green

# Kill existing processes
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Free ports
8081, 8082, 8083 | ForEach-Object {
    $pids = (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue).OwningProcess
    $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "Port $_ freed"
}

# Device mappings
$devices = @(
    @{ Serial = "emulator-5558"; Port = 8081; Tag = "TestUser1" }
    @{ Serial = "emulator-5554"; Port = 8082; Tag = "TestUser2" }  
    @{ Serial = "emulator-5556"; Port = 8083; Tag = "TestUser3" }
)

# Launch Metro for each device
foreach ($dev in $devices) {
    $serial = $dev.Serial
    $port = $dev.Port
    $tag = $dev.Tag
    
    Write-Host "Starting Metro for $tag on port $port -> $serial" -ForegroundColor Yellow
    
    # Create the command for dev client
    $cmd = @"
@echo off
title $tag-Metro-$port-$serial
echo ==========================================
echo $tag Metro Server - Port $port
echo Target Device: $serial
echo Dev Client Mode
echo ==========================================

set ANDROID_SERIAL=$serial

adb -s $serial wait-for-device
adb -s $serial reverse --remove-all
adb -s $serial reverse tcp:$port tcp:$port
adb -s $serial reverse tcp:8097 tcp:8097
echo Port mapping complete: ${serial}:${port}

echo Starting Metro for dev client...
npx expo start --port $port --host localhost --dev-client

pause
"@
    
    # Write to temp file and execute
    $tempFile = [System.IO.Path]::GetTempFileName() + ".bat"
    $cmd | Out-File -FilePath $tempFile -Encoding ASCII
    
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $tempFile -WindowStyle Normal
    
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Metro servers launched for DEV CLIENT:" -ForegroundColor Green
foreach ($dev in $devices) {
    Write-Host "  $($dev.Tag): $($dev.Serial) -> localhost:$($dev.Port)" -ForegroundColor White
}
Write-Host ""
Write-Host "Your dev client apps should automatically connect to their respective Metro servers." -ForegroundColor Cyan
Write-Host "Each device has its own isolated Metro instance on its assigned port." -ForegroundColor Cyan