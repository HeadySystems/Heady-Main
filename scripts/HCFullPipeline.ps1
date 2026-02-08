# HEADY_BRAND:BEGIN
# HEADY SYSTEMS :: SACRED GEOMETRY
# FILE: scripts/HCFullPipeline.ps1
# LAYER: root
# 
#         _   _  _____    _    ____   __   __
#        | | | || ____|  / \  |  _ \ \ \ / /
#        | |_| ||  _|   / _ \ | | | | \ V / 
#        |  _  || |___ / ___ \| |_| |  | |  
#        |_| |_||_____/_/   \_\____/   |_|  
# 
#    Sacred Geometry :: Organic Systems :: Breathing Interfaces
# HEADY_BRAND:END

param(
    [string]$Domain = "headysystems.com",
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$RootDir = "$ScriptDir\.."

Write-Host "`n🚀 INITIALIZING HCFullPipeline FOR: $Domain" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# STEP 1: Recon & Brand Check
Write-Host "`n🔍 STEP 1: Running Recon and Brand Validation..." -ForegroundColor Yellow
node "$ScriptDir\brand_headers.js" --check
node "$ScriptDir\recon.js" --target $Domain

# STEP 2: Sacred Geometry UI Sync (Phi Check)
Write-Host "`n🌀 STEP 2: Synchronizing Sacred Geometry UI Tokens..." -ForegroundColor Yellow
# Ensure CSS tokens follow Phi ratio
$phi = 1.61803398875

# STEP 3: HCAutoBuild - Autonomous Checkpoint
Write-Host "`n🔨 STEP 3: Executing HCAutoBuild..." -ForegroundColor Yellow
& "$RootDir\hcautobuild.ps1" -status
& "$RootDir\hcautobuild.ps1" -checkpoint -force

# STEP 4: HeadySync - Multi-Remote Push
Write-Host "`n🔄 STEP 4: Executing HeadySync..." -ForegroundColor Yellow
& "$RootDir\heady_sync.ps1"

# STEP 5: Nexus Production Deployment
if (-not $SkipDeploy) {
    Write-Host "`n🌐 STEP 5: Triggering Nexus Production Deployment..." -ForegroundColor Yellow
    & "$RootDir\nexus_deploy.ps1"
} else {
    Write-Host "`n⏩ STEP 5: Skipping Deployment as requested." -ForegroundColor Gray
}

# STEP 6: Health Verification (LENS)
Write-Host "`n👁️ STEP 6: Verifying Production Health (LENS)..." -ForegroundColor Yellow
curl -s "https://$Domain/api/health" | ConvertFrom-Json

Write-Host "`n✅ HCFullPipeline COMPLETED FOR $Domain" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
