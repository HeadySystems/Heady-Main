# HeadyVM Auto-Deploy Script - Clean Version
# Bypasses LFS issues for clean deployment

param(
    [switch]$Force,
    [switch]$SkipTests,
    [string]$Mode = "production"
)

Write-Host "🚀 HeadyVM Clean Auto-Deploy Starting..." -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Yellow

# Create clean deployment package
Write-Host "📦 Creating clean deployment package..." -ForegroundColor Green
$cleanDir = "heady-clean-deploy"
if (Test-Path $cleanDir) {
    Remove-Item -Recurse -Force $cleanDir
}

# Copy essential files only (exclude large binaries)
$excludePatterns = @(
    "*.zip", "*.exe", "*.dll", "*.bin", "*.iso", "*.img",
    "AndroidSDK/**", "ventoy/**", "gradle/**", "cmake/**", 
    "node_modules/**", ".git/**", "dist/**", "build/**"
)

# Create clean directory structure
New-Item -ItemType Directory -Path $cleanDir -Force
Copy-Item -Path ".windsurf/" -Destination "$cleanDir/.windsurf/" -Recurse -Force
Copy-Item -Path "configs/" -Destination "$cleanDir/configs/" -Recurse -Force
Copy-Item -Path "scripts/" -Destination "$cleanDir/scripts/" -Recurse -Force
Copy-Item -Path "src/" -Destination "$cleanDir/src/" -Recurse -Force
Copy-Item -Path "services/" -Destination "$cleanDir/services/" -Recurse -Force
Copy-Item -Path "heady-manager.js" -Destination "$cleanDir/"
Copy-Item -Path "heady-registry.json" -Destination "$cleanDir/"
Copy-Item -Path "package.json" -Destination "$cleanDir/"
Copy-Item -Path "render.yml" -Destination "$cleanDir/"
Copy-Item -Path "README.md" -Destination "$cleanDir/"

# Initialize clean git repo
Set-Location $cleanDir
git init
git add .
git commit -m "HeadyVM clean deployment package" --no-verify

# Add HeadyMe remote and push
git remote add heady-me git@github.com:HeadyMe/Heady.git
Write-Host "📤 Pushing clean package to HeadyMe..." -ForegroundColor Green

try {
    git push heady-me main --force
    Write-Host "✅ Clean deployment pushed to HeadyMe" -ForegroundColor Green
} catch {
    Write-Warning "Push failed: $($_.Exception.Message)"
}

Set-Location ..

# Trigger deployment via API
Write-Host "🔄 Triggering HeadyVM deployment..." -ForegroundColor Green
$body = @{
    mode = $Mode
    force = $Force.IsPresent
    skip_tests = $SkipTests.IsPresent
    clean_deploy = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://headysystems.com/api/deploy" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Deployment triggered: $($response.deployment_id)" -ForegroundColor Green
    Write-Host "📊 Status: $($response.status)" -ForegroundColor Yellow
} catch {
    Write-Warning "Deployment trigger failed: $($_.Exception.Message)"
    Write-Host "🔗 Manual deployment may be required" -ForegroundColor Cyan
}

Write-Host "🎉 HeadyVM Clean Auto-Deploy Complete!" -ForegroundColor Green
Write-Host "📱 Monitor at: https://headysystems.com/status" -ForegroundColor Cyan
