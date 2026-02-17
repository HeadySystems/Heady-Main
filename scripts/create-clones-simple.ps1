# ============================================================
# HEADY SYSTEMS | Simple Clone Creation
# ============================================================
# Creates fresh clone directories with timestamp suffix

$ErrorActionPreference = 'Stop'
$canonicalPath = "c:\Users\erich\Heady"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$repos = @(
    @{
        Name = "HeadyStack-Hybrid-Workstation-$timestamp"
        Type = "hybrid"
        Profile = "hybrid.yml"
        Description = "Local-first with cloud fallback"
    },
    @{
        Name = "HeadyStack-Offline-Secure-$timestamp"
        Type = "offline"
        Profile = "local-offline.yml"
        Description = "Air-gapped, maximum privacy"
    },
    @{
        Name = "HeadyStack-Cloud-Hub-$timestamp"
        Type = "cloud"
        Profile = "cloud-saas.yml"
        Description = "Cloud-optimized SaaS deployment"
    }
)

foreach ($repo in $repos) {
    $targetPath = Join-Path (Split-Path $canonicalPath) $repo.Name
    
    Write-Host "`n=== Creating $($repo.Name) ===" -ForegroundColor Cyan
    Write-Host "Type: $($repo.Type)" -ForegroundColor White
    Write-Host "Profile: $($repo.Profile)" -ForegroundColor White
    
    # Copy canonical structure
    Write-Host "Copying canonical structure..." -ForegroundColor Green
    Get-ChildItem -Path $canonicalPath -Exclude '.git','node_modules','*.log' | 
        Copy-Item -Destination $targetPath -Recurse -Force
    
    # Update repo-type.yaml
    $repoTypePath = Join-Path $targetPath 'repo-type.yaml'
    $repoTypeContent = @"
type: $($repo.Type)

identity:
  name: $($repo.Name)
  entity: HeadySystems
  year: 2026
  role: clone
  description: $($repo.Description)

defaultDockerProfile: $($repo.Profile)

allowedProviders: $(if ($repo.Type -eq 'offline') { @('- local') } else { @('- local', '- cloud') })

modelRouterPolicy: $(if ($repo.Type -eq 'offline') { 'LOCAL_ONLY' } elseif ($repo.Type -eq 'cloud') { 'CLOUD_ONLY' } else { 'LOCAL_FIRST' })

maintenanceCadence: daily

cloneSource: $canonicalPath
canonicalTag: v1.0.0-mono
"@
    Set-Content -Path $repoTypePath -Value $repoTypeContent -NoNewline
    Write-Host "Updated repo-type.yaml" -ForegroundColor Green
    
    # Update README.md
    $readmePath = Join-Path $targetPath 'README.md'
    if (Test-Path $readmePath) {
        $content = Get-Content $readmePath -Raw
        $content = $content -replace '# HeadyStack', "# $($repo.Name)"
        $content = $content -replace 'Entity:.*', "Entity: HeadySystems"
        $content = $content -replace 'Role:.*', "Role: Clone - $($repo.Description)"
        Set-Content -Path $readmePath -Value $content -NoNewline
        Write-Host "Updated README.md" -ForegroundColor Green
    }
    
    Write-Host "✅ Created $($repo.Name) at $targetPath" -ForegroundColor Green
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Created $($repos.Count) clone repositories:" -ForegroundColor White
$repos | ForEach-Object { Write-Host "  - $($_.Name) ($($_.Type))" -ForegroundColor Green }

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. cd into any clone directory" -ForegroundColor White
Write-Host "2. Run: docker compose -f infra/docker/docker-compose.base.yml -f infra/docker/profiles/<profile>.yml up" -ForegroundColor White
Write-Host "3. Verify services at http://localhost:3300 (API) and http://localhost:3000 (Web)" -ForegroundColor White
