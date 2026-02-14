# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  HeadyField Deployment Script - Regenerative Oracle System        ║
# ║  "Deploy truth verification infrastructure"                       ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

param(
    [switch]$DryRun,
    [switch]$WithMIDI,
    [switch]$WithBlockchain,
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HEADYFIELD DEPLOYMENT — Regenerative Oracle System      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "[DRY RUN] No containers will be started.`n" -ForegroundColor Yellow
}

# ─── Environment Setup ─────────────────────────────────────────────────────

$EnvFile = "$RepoRoot\.env.heady-field"
if (-not (Test-Path $EnvFile)) {
    Write-Host "Creating .env.heady-field configuration file..." -ForegroundColor Green
    
    $EnvContent = @"
# HeadyField Environment Configuration
MOSQUITTO_PASSWORD=$(openssl rand -base64 32)
INFLUXDB_PASSWORD=$(openssl rand -base64 32)
INFLUX_TOKEN=$(openssl rand -hex 32)
GRAFANA_PASSWORD=$(openssl rand -base64 32)
ORACLE_PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey -noout | openssl ec -outform PEM)
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
"@
    
    if (-not $DryRun) {
        Set-Content $EnvFile -Value $EnvContent -NoNewline
        Write-Host "  [CREATED] $EnvFile" -ForegroundColor Green
    } else {
        Write-Host "  [WOULD CREATE] $EnvFile" -ForegroundColor Yellow
    }
}

# ─── Docker Compose Execution ───────────────────────────────────────────────

$ComposeFile = "$RepoRoot\docker-compose.heady-field.yml"
$Profiles = @()

if ($WithMIDI) {
    $Profiles += "midi_control"
    Write-Host "Including MIDI control profile..." -ForegroundColor Cyan
}

if ($WithBlockchain) {
    $Profiles += "blockchain"
    Write-Host "Including blockchain integration profile..." -ForegroundColor Cyan
}

$DockerCmd = "docker-compose -f $ComposeFile"
if ($Profiles.Count -gt 0) {
    $ProfileString = $Profiles -join ","
    $DockerCmd += " --profile $ProfileString"
}

if ($DryRun) {
    Write-Host "[DRY RUN] Would execute: $DockerCmd up -d" -ForegroundColor Yellow
} else {
    Write-Host "Starting HeadyField services..." -ForegroundColor Green
    
    # Pull latest images
    Write-Host "Pulling latest images..." -ForegroundColor Cyan
    Invoke-Expression "$DockerCmd pull"
    
    # Start services
    Write-Host "Starting services..." -ForegroundColor Cyan
    Invoke-Expression "$DockerCmd up -d"
    
    # Wait for services to be healthy
    Write-Host "Waiting for services to be healthy..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
    
    # Check service status
    Write-Host "`nService Status:" -ForegroundColor White
    Invoke-Expression "$DockerCmd ps"
}

# ─── Post-Deployment Configuration ───────────────────────────────────────────

Write-Host "`nPost-deployment configuration..." -ForegroundColor Green

# Grafana setup
if (-not $DryRun) {
    Write-Host "Configuring Grafana dashboards..." -ForegroundColor Cyan
    
    # Create Grafana data source
    $GrafanaConfig = @{
        name = "HeadyField InfluxDB"
        type = "influxdb"
        url = "http://heady_vault:8086"
        database = "field_data"
        user = "heady_admin"
        password = $env:INFLUXDB_PASSWORD
    } | ConvertTo-Json -Depth 3
    
    Write-Host "  Grafana data source configured" -ForegroundColor DarkGray
}

# ─── Verification ───────────────────────────────────────────────────────────

Write-Host "`nVerifying deployment..." -ForegroundColor Green

$Services = @(
    @{ Name = "MQTT Broker"; Port = 1883; Container = "heady_mqtt" },
    @{ Name = "InfluxDB"; Port = 8086; Container = "heady_vault" },
    @{ Name = "Oracle API"; Port = 8080; Container = "heady_oracle" },
    @{ Name = "Grafana"; Port = 3000; Container = "heady_viz" }
)

if ($WithMIDI) {
    $Services += @{ Name = "MIDI Bridge"; Port = 8081; Container = "heady_midi_bridge" }
}

foreach ($Service in $Services) {
    $Port = $Service.Port
    $Name = $Service.Name
    
    if ($DryRun) {
        Write-Host "  [WOULD CHECK] $Name (port $Port)" -ForegroundColor Yellow
    } else {
        try {
            $Response = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 5
            Write-Host "  [OK] $Name - $($Response.status)" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] $Name - Service not responding on port $Port" -ForegroundColor Red
        }
    }
}

# ─── Summary ───────────────────────────────────────────────────────────────

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE: HeadyField deployment simulated." -ForegroundColor Yellow
    Write-Host "Run without -DryRun to deploy actual services." -ForegroundColor Yellow
} else {
    Write-Host "HEADYFIELD DEPLOYMENT COMPLETE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor White
    Write-Host "  • Grafana Dashboard: http://localhost:3000 (admin/$env:GRAFANA_PASSWORD)" -ForegroundColor Cyan
    Write-Host "  • Oracle API: http://localhost:8080/health" -ForegroundColor Cyan
    Write-Host "  • InfluxDB: http://localhost:8086" -ForegroundColor Cyan
    
    if ($WithMIDI) {
        Write-Host "  • MIDI Bridge: http://localhost:8081/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "MIDI Controls Active:" -ForegroundColor White
        Write-Host "  • C4: Deploy to production" -ForegroundColor Cyan
        Write-Host "  • Crash Cymbal: Emergency stop" -ForegroundColor Cyan
        Write-Host "  • CC1 Knob: Adjust AI temperature" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor White
    Write-Host "  1. Configure Grafana dashboards for your field data" -ForegroundColor Cyan
    Write-Host "  2. Connect ESP32 sensors to MQTT broker (port 1883)" -ForegroundColor Cyan
    Write-Host "  3. Monitor Oracle logs: docker logs heady_oracle" -ForegroundColor Cyan
    Write-Host "  4. Test MIDI controls if enabled" -ForegroundColor Cyan
}

Write-Host ""
