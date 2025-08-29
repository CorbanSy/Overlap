# Enhanced Multi-Metro setup with device isolation (PowerShell 5.1 compatible)

Write-Host "Enhanced 3-Metro setup with device isolation" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

function Kill-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($proc in $processes) {
            Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
            Write-Host "Killed process $proc on port $Port" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "No processes found on port $Port" -ForegroundColor Gray
    }
}

function Get-DeviceId([int]$i) {
    if ($script:devices -and $script:devices.Count -gt $i) {
        $val = $script:devices[$i]
        if ($null -ne $val -and $val -ne '') { return $val }
    }
    return 'auto'
}

# ─────────────────────────────────────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────────────────────────────────────

Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force
foreach ($port in @(8081,8082,8083)) { Kill-ProcessOnPort -Port $port }

Write-Host "Resetting ADB server..." -ForegroundColor Yellow
& adb kill-server
Start-Sleep -Seconds 2
& adb start-server
Start-Sleep -Seconds 3

# ─────────────────────────────────────────────────────────────────────────────
# Devices
# ─────────────────────────────────────────────────────────────────────────────

Write-Host "Checking available Android devices..." -ForegroundColor Cyan
$devices = (& adb devices) |
    Where-Object { $_ -match '^\s*emulator-\d+\s+device' } |
    ForEach-Object { ($_ -split '\s+')[0] }
$script:devices = $devices

Write-Host "Found devices: $($devices -join ', ')" -ForegroundColor Green
if (-not $devices -or $devices.Count -lt 3) {
    Write-Host "WARNING: Less than 3 devices detected. Make sure all emulators are running." -ForegroundColor Red
    & adb devices
}

# ─────────────────────────────────────────────────────────────────────────────
# Project + ports
# ─────────────────────────────────────────────────────────────────────────────

$projectDir = Get-Location
$testDirs = @("TestUser1","TestUser2","TestUser3")
$ports    = @(8081,8082,8083)

if (!(Test-Path "package.json")) {
    Write-Host "ERROR: No package.json found. Run this from your Expo project directory." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'npx' not found in PATH. Install Node.js (includes npm/npx)." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Metro bundlers with device isolation..." -ForegroundColor Cyan

# ─────────────────────────────────────────────────────────────────────────────
# Start three Metro instances (one window per instance)
# ─────────────────────────────────────────────────────────────────────────────

for ($i = 0; $i -lt 3; $i++) {
    $userDir  = $testDirs[$i]
    $port     = $ports[$i]
    $deviceId = Get-DeviceId $i

    Write-Host "Starting Metro for $userDir on port $port targeting device $deviceId..." -ForegroundColor Yellow

    $cmdParts = @(
        "title $userDir-Metro-$port"
        "echo === $userDir Metro on Port $port ==="
        "echo Target Device: $deviceId"
    )

    if ($deviceId -ne 'auto') {
        $cmdParts += "set ANDROID_SERIAL=$deviceId"
    } else {
        $cmdParts += "echo ANDROID_SERIAL not set (auto)"
    }

    $cmdParts += @(
        "set EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0"
        "set REACT_NATIVE_PACKAGER_HOSTNAME=localhost"
        "npx expo start --port $port --clear --localhost"
    )

    # Build a single-line command with && so any earlier failure stops the chain
    $cmd = $cmdParts -join " && "

    Start-Process -FilePath "cmd.exe" `
                  -ArgumentList "/k", $cmd `
                  -WorkingDirectory $projectDir `
                  -WindowStyle Normal

    Start-Sleep -Seconds 8   # Stagger launches
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary + tips
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "All Metro bundlers started with device isolation!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT SETUP STEPS:" -ForegroundColor Red
Write-Host "1. Give Metro 30–60 seconds to fully initialize" -ForegroundColor White
Write-Host "2. In each Metro window:" -ForegroundColor White
Write-Host "   - Press 'd' for dev menu" -ForegroundColor White
Write-Host "   - Press 'a' to install/run on Android (pinned to that window's device)" -ForegroundColor White
Write-Host ""

$dev0 = Get-DeviceId 0
$dev1 = Get-DeviceId 1
$dev2 = Get-DeviceId 2
Write-Host "Metro Configuration:" -ForegroundColor Yellow
Write-Host "  TestUser1: http://localhost:8081 -> Device: $dev0"
Write-Host "  TestUser2: http://localhost:8082 -> Device: $dev1"
Write-Host "  TestUser3: http://localhost:8083 -> Device: $dev2"
Write-Host ""

Write-Host "Manual install (if needed):" -ForegroundColor Cyan
Write-Host "  adb -s emulator-5554 install app.apk  (TestUser1)" -ForegroundColor Gray
Write-Host "  adb -s emulator-5556 install app.apk  (TestUser2)" -ForegroundColor Gray
Write-Host "  adb -s emulator-5558 install app.apk  (TestUser3)" -ForegroundColor Gray

# ─────────────────────────────────────────────────────────────────────────────
# Status check (optional – informative only)
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Performing enhanced status check in 20 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "=== SYSTEM STATUS ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "Port Status:" -ForegroundColor Yellow
foreach ($port in @(8081,8082,8083)) {
    if (Test-Port -Port $port) {
        Write-Host "  Port ${port}: ACTIVE ✓" -ForegroundColor Green
    } else {
        Write-Host "  Port ${port}: INACTIVE ✗" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Android Devices:" -ForegroundColor Yellow
& adb devices

Write-Host ""
Write-Host "Active Node Processes:" -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Format-Table Id, ProcessName, StartTime -AutoSize
} else {
    Write-Host "  No Node processes found" -ForegroundColor Red
}

Write-Host ""
Write-Host "TROUBLESHOOTING TIPS:" -ForegroundColor Magenta
Write-Host "• If windows show errors (e.g., missing packages), fix them and press 'r' to reload"
Write-Host "• Make sure each Metro window displays the expected emulator id"
Write-Host "• If ports are still INACTIVE, check those Metro windows for errors (they now stay open)"
Write-Host ""
Write-Host "Setup complete! Keep an eye on each Metro window." -ForegroundColor Green
