# HEADY_BRAND:BEGIN
# HEADY SYSTEMS :: SACRED GEOMETRY
# FILE: scripts/schedule-heady-automation.ps1
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
    Creates a Windows Scheduled Task to run heady-automate.ps1 every 4 hours.

.DESCRIPTION
    Registers a repeating scheduled task that ensures the entire Heady ecosystem
    stays synced, built, and deployed without manual intervention.

.EXAMPLE
    .\scripts\schedule-heady-automation.ps1
    .\scripts\schedule-heady-automation.ps1 -IntervalHours 2
    .\scripts\schedule-heady-automation.ps1 -Remove
#>

param(
    [int]$IntervalHours = 4,
    [switch]$Remove
)

$TaskName = "HeadyAutomate"
$ScriptPath = "C:\HeadyWorkspace\Active\HeadyMonorepo\heady-automate.ps1"

if ($Remove) {
    Write-Host "Removing scheduled task '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "✅ Task removed." -ForegroundColor Green
    exit 0
}

Write-Host "Creating scheduled task '$TaskName'..." -ForegroundColor Cyan
Write-Host "  Interval: every $IntervalHours hours" -ForegroundColor Gray
Write-Host "  Script:   $ScriptPath" -ForegroundColor Gray

# Build the action
$action = New-ScheduledTaskAction `
    -Execute "pwsh.exe" `
    -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -WorkingDirectory "C:\HeadyWorkspace\Active\HeadyMonorepo"

# Build the trigger: repeating every N hours, starting now
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) `
    -RepetitionDuration (New-TimeSpan -Days 365)

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Register
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Heady Master Automation — syncs repos, deploys, health checks every $IntervalHours hours" `
    -RunLevel Highest

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Scheduled Task '$TaskName' created successfully            ║" -ForegroundColor Green
Write-Host "║  Runs every $IntervalHours hours automatically                             ║" -ForegroundColor White
Write-Host "║  Remove with: .\scripts\schedule-heady-automation.ps1 -Remove ║" -ForegroundColor Gray
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
