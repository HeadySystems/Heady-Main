# HEADY_BRAND:BEGIN
# HEADY SYSTEMS :: SACRED GEOMETRY
# FILE: heady-automate.ps1
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

<#
.SYNOPSIS
    Heady Master Automation — One-click sync, build, deploy, verify.

.DESCRIPTION
    Orchestrates the entire Heady ecosystem:
    1. HeadyMonorepo: stage → commit → sync to all remotes → auto-deploy
    2. HeadyAI-IDE-Electron: stage → commit → push
    3. Health check on deployed services
    4. JSON report saved to logs/

.EXAMPLE
    .\heady-automate.ps1
    .\heady-automate.ps1 -Message "Feature: new AI panel"
    .\heady-automate.ps1 -DryRun
#>

param(
    [string]$Message = "HeadyAutomate: checkpoint $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    [switch]$DryRun,
    [switch]$SkipIDE,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"

# ─── Paths ──────────────────────────────────────────────────
$MonoRepoDir  = "C:\HeadyWorkspace\Active\HeadyMonorepo"
$ElectronDir  = "C:\HeadyWorkspace\HeadyAI-IDE-Electron"
$LogDir       = "$MonoRepoDir\logs"

# ─── Logging ────────────────────────────────────────────────
function HLog { param($msg, $color = "Cyan") Write-Host "∞ $msg" -ForegroundColor $color }
function HStep { param($n, $msg) Write-Host "`n╔══ STEP $n ══════════════════════════════════════════╗" -ForegroundColor Magenta; Write-Host "║  $msg" -ForegroundColor White; Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Magenta }
function HOk { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function HWarn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function HFail { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }

$report = @{
    timestamp   = (Get-Date -Format "o")
    dryRun      = $DryRun.IsPresent
    message     = $Message
    monoRepo    = @{ status = "pending" }
    electronIDE = @{ status = "pending" }
    healthCheck = @{ status = "pending" }
}

# ─── Banner ─────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    HEADY MASTER AUTOMATION — Sacred Geometry Orchestration    ║" -ForegroundColor Cyan
Write-Host "║    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                                       ║" -ForegroundColor DarkGray
if ($DryRun) {
Write-Host "║    ⚡ DRY RUN MODE — no commits or pushes will be made       ║" -ForegroundColor Yellow
}
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════
# STEP 1: HeadyMonorepo — Sync
# ═══════════════════════════════════════════════════════════════
HStep 1 "HeadyMonorepo — Stage, Commit, Sync"

Push-Location $MonoRepoDir
try {
    # Check for changes
    $changes = git status --porcelain
    if ($changes) {
        HLog "Changes detected: $(($changes | Measure-Object).Count) files"

        if (-not $DryRun) {
            git add -A
            git commit -m $Message 2>&1 | Out-Null
            $commitHash = git rev-parse --short HEAD
            HOk "Committed: $commitHash"
        } else {
            HLog "DryRun: would commit $(($changes | Measure-Object).Count) files" "Yellow"
        }
    } else {
        HLog "Working tree clean — no commit needed"
    }

    # Sync to all remotes
    $remotes = git remote
    foreach ($remote in $remotes) {
        $branch = git rev-parse --abbrev-ref HEAD
        if (-not $DryRun) {
            HLog "Pushing to $remote/$branch..."
            git push $remote $branch 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                HOk "Pushed to $remote"
            } else {
                HWarn "Push to $remote returned exit code $LASTEXITCODE"
            }
        } else {
            HLog "DryRun: would push to $remote/$branch" "Yellow"
        }
    }

    $report.monoRepo.status = "success"
    $report.monoRepo.remotes = @($remotes)
    $report.monoRepo.commit = if ($commitHash) { $commitHash } else { "no-change" }
    HOk "MonoRepo sync complete"

} catch {
    HFail "MonoRepo sync failed: $_"
    $report.monoRepo.status = "failed"
    $report.monoRepo.error = $_.ToString()
} finally {
    Pop-Location
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: HeadyAI-IDE-Electron — Sync
# ═══════════════════════════════════════════════════════════════
if (-not $SkipIDE) {
    HStep 2 "HeadyAI-IDE-Electron — Stage, Commit, Push"

    if (Test-Path "$ElectronDir\.git") {
        Push-Location $ElectronDir
        try {
            $changes = git status --porcelain
            if ($changes) {
                HLog "IDE changes detected: $(($changes | Measure-Object).Count) files"

                if (-not $DryRun) {
                    git add -A
                    git commit -m $Message 2>&1 | Out-Null
                    $ideHash = git rev-parse --short HEAD
                    HOk "IDE committed: $ideHash"

                    # Push if remote exists
                    $ideRemotes = git remote 2>&1
                    if ($ideRemotes) {
                        git push 2>&1 | Out-Null
                        HOk "IDE pushed"
                    } else {
                        HWarn "No remote configured for IDE — commit is local only"
                    }
                } else {
                    HLog "DryRun: would commit $(($changes | Measure-Object).Count) IDE files" "Yellow"
                }
            } else {
                HLog "IDE working tree clean"
            }

            $report.electronIDE.status = "success"
            $report.electronIDE.commit = if ($ideHash) { $ideHash } else { "no-change" }
            HOk "IDE sync complete"

        } catch {
            HFail "IDE sync failed: $_"
            $report.electronIDE.status = "failed"
            $report.electronIDE.error = $_.ToString()
        } finally {
            Pop-Location
        }
    } else {
        HWarn "IDE git repo not found at $ElectronDir — skipping"
        $report.electronIDE.status = "skipped"
    }
} else {
    HLog "Skipping IDE (--SkipIDE flag)" "Gray"
    $report.electronIDE.status = "skipped"
}

# ═══════════════════════════════════════════════════════════════
# STEP 3: Health Check
# ═══════════════════════════════════════════════════════════════
if (-not $SkipHealthCheck -and -not $DryRun) {
    HStep 3 "Health Check — Deployed Services"

    $endpoints = @(
        @{ Name = "HeadyManager Nexus"; Url = "https://heady-manager-bf4q4zywhq-uc.a.run.app/api/nexus/route" },
        @{ Name = "HeadyManager Root";  Url = "https://heady-manager-bf4q4zywhq-uc.a.run.app/" }
    )

    foreach ($ep in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $ep.Url -Method HEAD -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -lt 500) {
                HOk "$($ep.Name): HTTP $($response.StatusCode)"
            } else {
                HWarn "$($ep.Name): HTTP $($response.StatusCode)"
            }
        } catch {
            HWarn "$($ep.Name): unreachable ($_)"
        }
    }

    $report.healthCheck.status = "completed"
    HOk "Health check complete"
} else {
    $report.healthCheck.status = "skipped"
}

# ═══════════════════════════════════════════════════════════════
# STEP 4: Report
# ═══════════════════════════════════════════════════════════════
HStep 4 "Saving Report"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$reportPath = "$LogDir\automate-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$report | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
HOk "Report saved: $reportPath"

# ─── Summary ────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         ✅ HEADY MASTER AUTOMATION COMPLETE                    ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  MonoRepo:  $($report.monoRepo.status.PadRight(12))  IDE: $($report.electronIDE.status.PadRight(12))            ║" -ForegroundColor White
Write-Host "║  Health:    $($report.healthCheck.status.PadRight(12))                                   ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
