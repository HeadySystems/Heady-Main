# HCFP PHASE 0: SYSTEM STABILIZATION AND RESOURCE CONTROL
# This MUST be executed FIRST before any other phases
# Purpose: Fix system freezes, resource allocation, and prepare for Docker/backend restoration

Write-Host "===========================================" -ForegroundColor Red
Write-Host "HCFP PHASE 0: SYSTEM STABILIZATION" -ForegroundColor Red
Write-Host "CRITICAL: Fix resource issues FIRST" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Red

# Step 1: Hardware and System Health Check
Write-Host "`n[1/8] Running hardware diagnostics..." -ForegroundColor Yellow

# Check system file integrity
Write-Host "  Checking system files..." -ForegroundColor Cyan
sfc /scannow
dism /online /cleanup-image /restorehealth

# Check disk health
Write-Host "  Checking disk health..." -ForegroundColor Cyan
chkdsk C: /f /r /x

# Check memory
Write-Host "  Testing memory..." -ForegroundColor Cyan
$memTest = Get-WmiObject -Class Win32_PhysicalMemory | ForEach-Object {
    [PSCustomObject]@{
        Manufacturer = $_.Manufacturer
        Capacity = [math]::Round($_.Capacity/1GB, 2)
        Speed = $_.Speed
        Status = if($_.Status) { $_.Status } else { "OK" }
    }
}
$memTest | Format-Table -AutoSize

# Check thermal status
Write-Host "  Checking thermal status..." -ForegroundColor Cyan
try {
    $thermal = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -ErrorAction Stop
    $thermal | ForEach-Object {
        $currentTempKelvin = $_.CurrentTemperature / 10
        $currentTempCelsius = $currentTempKelvin - 273.15
        Write-Host "    Temperature: $([math]::Round($currentTempCelsius, 1))°C" -ForegroundColor $(if($currentTempCelsius -gt 80){"Red"}else{"Green"})
    }
} catch {
    Write-Host "    Unable to read thermal sensors" -ForegroundColor Yellow
}

# Step 2: Identify and Kill Resource Hogs
Write-Host "`n[2/8] Identifying resource-intensive processes..." -ForegroundColor Yellow

$topCPU = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, ID, CPU, WS
$topMem = Get-Process | Sort-Object WS -Descending | Select-Object -First 10 Name, ID, CPU, @{Name="Mem(GB)";Expression={[math]::Round($_.WS/1GB,2)}}

Write-Host "`n  Top CPU consumers:" -ForegroundColor Cyan
$topCPU | Format-Table -AutoSize

Write-Host "`n  Top Memory consumers:" -ForegroundColor Cyan
$topMem | Format-Table -AutoSize

# Kill specific problematic processes
$killList = @(
    "Docker Desktop",
    "com.docker.service",
    "com.docker.backend",
    "docker",
    "HeadyOverlay"
)

# ... (rest of script)

# Show current resource usage
Write-Host "`nCurrent System Status:" -ForegroundColor Cyan
$cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
$mem = (Get-Counter '\Memory\Available MBytes').CounterSamples.CookedValue
$totalMem = (Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1MB
$usedMem = $totalMem - $mem

Write-Host "  CPU Usage: $([math]::Round($cpu, 1))%" -ForegroundColor $(if($cpu -gt 80){"Red"}else{"Green"})
Write-Host "  Memory Used: $([math]::Round($usedMem, 0)) MB / $([math]::Round($totalMem, 0)) MB ($([math]::Round($usedMem/$totalMem*100, 1))%)" -ForegroundColor $(if($usedMem/$totalMem -gt 0.8){"Red"}else{"Green"})

Write-Host "`n⚠️  IMPORTANT: Reboot recommended before Phase 1" -ForegroundColor Yellow
Write-Host "Proceeding to next phase..." -ForegroundColor Green
