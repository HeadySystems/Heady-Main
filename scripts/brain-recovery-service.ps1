# Heady Brain Recovery Service
# Ensures 100% brain functionality at all times

param(
    [switch]$Continuous,
    [int]$IntervalSeconds = 30
)

$ErrorActionPreference = 'Stop'

# Brain endpoints in priority order
$BrainEndpoints = @(
    @{ Name = 'Primary'; Url = 'https://brain.headysystems.com' },
    @{ Name = 'Fallback1'; Url = 'https://52.32.178.8' },
    @{ Name = 'Fallback2'; Url = 'https://brain-backup.headysystems.com' },
    @{ Name = 'Local'; Url = 'http://localhost:8081' }
)

function Test-BrainEndpoint {
    param($Endpoint)
    
    try {
        $response = Invoke-WebRequest -Uri $Endpoint.Url -Method HEAD -TimeoutSec 3 -UseBasicParsing
        return @{
            Healthy = $true
            ResponseTime = $response.Headers['X-Response-Time'] ?? 'N/A'
        }
    } catch {
        return @{
            Healthy = $false
            Error = $_.Exception.Message
        }
    }
}

function Start-LocalBrain {
    Write-Host "[RECOVERY] Starting local brain service..." -ForegroundColor Yellow
    
    # Kill any existing brain processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | 
        Where-Object { $_.MainWindowTitle -like "*brain*" -or $_.CommandLine -like "*brain*" } | 
        Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start brain service
    try {
        Set-Location 'C:\Users\erich\Heady'
        Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'npm run brain:dev' -WindowStyle Hidden
        Start-Sleep -Seconds 5
        
        $test = Test-BrainEndpoint -Endpoint @{ Url = 'http://localhost:8081' }
        if ($test.Healthy) {
            Write-Host "[RECOVERY] Local brain service started successfully" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[RECOVERY] Failed to start local brain: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $false
}

function Invoke-BrainRecovery {
    Write-Host "$(Get-Date -Format 'HH:mm:ss') [HEALTH] Checking brain endpoints..." -ForegroundColor Cyan
    
    $healthyEndpoint = $null
    
    # Test all endpoints
    foreach ($endpoint in $BrainEndpoints) {
        $result = Test-BrainEndpoint -Endpoint $endpoint
        
        if ($result.Healthy) {
            Write-Host "  [OK] $($endpoint.Name) brain healthy ($($result.ResponseTime))" -ForegroundColor Green
            $healthyEndpoint = $endpoint
            break
        } else {
            Write-Host "  [FAIL] $($endpoint.Name) brain down: $($result.Error)" -ForegroundColor Red
        }
    }
    
    if (-not $healthyEndpoint) {
        Write-Host "[EMERGENCY] ALL BRAIN ENDPOINTS DOWN - INITIATING RECOVERY" -ForegroundColor Red
        
        # Attempt local recovery
        if (Start-LocalBrain) {
            Write-Host "[RECOVERY] Brain functionality RESTORED via local service" -ForegroundColor Green
            
            # Notify monitoring
            try {
                $body = @{
                    status = 'recovered'
                    endpoint = 'http://localhost:8081'
                    timestamp = (Get-Date).ToString('o')
                } | ConvertTo-Json
                
                Invoke-RestMethod -Uri 'https://api.headysystems.com/api/brain/status' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 5 -ErrorAction SilentlyContinue
            } catch {
                # Notification failed but brain is working
            }
        } else {
            Write-Host "[CRITICAL] BRAIN RECOVERY FAILED - MANUAL INTERVENTION REQUIRED" -BackgroundColor Red -ForegroundColor White
            Write-Host "This violates the 100% functionality requirement!" -BackgroundColor Red -ForegroundColor White
            
            # Send critical alert
            try {
                $alert = @{
                    severity = 'critical'
                    message = 'BRAIN SERVICE COMPLETELY UNAVAILABLE'
                    timestamp = (Get-Date).ToString('o')
                    allEndpointsDown = $true
                } | ConvertTo-Json
                
                Invoke-RestMethod -Uri 'https://api.headysystems.com/api/alerts' -Method POST -Body $alert -ContentType 'application/json' -TimeoutSec 5 -ErrorAction SilentlyContinue
            } catch {
                # Even alerting failed - complete system failure
            }
        }
    }
    
    Write-Host ""
}

# Main execution
if ($Continuous) {
    Write-Host "[MONITOR] Starting continuous brain recovery (interval: ${IntervalSeconds}s)" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        Invoke-BrainRecovery
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    Invoke-BrainRecovery
}
