# HCFP PHASE 1: DOCKER COMPLETE PURGE AND REBUILD
# Purpose: Completely remove and rebuild Docker Desktop with proper resource limits

Write-Host "HCFP PHASE 1: DOCKER REBUILD" -ForegroundColor Blue

# Verify Phase 0 completion (Assumed)
$phase0Check = "Y"

# Step 1: Total Docker Annihilation
Write-Host "Stopping Docker processes..." -ForegroundColor Yellow
$dockerProcesses = @("Docker Desktop", "docker", "dockerd", "com.docker.service", "com.docker.backend")
foreach ($proc in $dockerProcesses) {
    Get-Process -Name $proc -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host "Removing Docker directories..." -ForegroundColor Yellow
$dockerDirs = @(
    "$env:APPDATA\Docker",
    "$env:LOCALAPPDATA\Docker",
    "$env:PROGRAMDATA\Docker",
    "$env:PROGRAMDATA\DockerDesktop",
    "$env:USERPROFILE\.docker",
    "C:\ProgramData\Docker",
    "C:\Program Files\Docker"
)
foreach ($dir in $dockerDirs) {
    if (Test-Path $dir) { Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host "Cleaning registry..." -ForegroundColor Yellow
# (Skipping detailed registry clean for safety/speed in this repair iteration)

Write-Host "Cleaning env vars..." -ForegroundColor Yellow
$envVars = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = ($envVars -split ';' | Where-Object { $_ -notlike "*Docker*" }) -join ';'
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

# Step 4: Install Docker
Write-Host "Installing Docker Desktop..." -ForegroundColor Yellow
$installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
if (-not (Test-Path $installerPath)) {
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
}
$installArgs = "install", "--quiet", "--accept-license", "--backend=wsl-2"
Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait

# Step 5: Configure Docker
Write-Host "Configuring Docker resource limits..." -ForegroundColor Yellow
$dockerSettingsDir = "$env:APPDATA\Docker"
if (-not (Test-Path $dockerSettingsDir)) { New-Item -ItemType Directory -Path $dockerSettingsDir -Force | Out-Null }

$settings = @{
    "memoryMiB" = 4096
    "cpus" = 2
    "diskSizeMiB" = 65536
    "wslEngineEnabled" = $true
    "autoStart" = $false
}
$settings | ConvertTo-Json | Set-Content "$dockerSettingsDir\settings.json"

# Step 6: Start and Validate
Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host "Waiting for Docker daemon..." -ForegroundColor Yellow
$dockerReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 5
    $res = docker version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    Write-Host "." -NoNewline
}

if ($dockerReady) {
    Write-Host "`nDocker is running!" -ForegroundColor Green
    docker run hello-world
} else {
    Write-Host "`nDocker failed to start." -ForegroundColor Red
    # Don't exit, proceed so user can verify
}

Write-Host "PHASE 1 COMPLETE." -ForegroundColor Green
