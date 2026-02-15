# Heady Systems - Remove Localhost References Script
# Replaces localhost, 127.0.0.1, and .onrender.com with proper Heady domains

Write-Host "🔧 Removing localhost and .onrender.com references..." -ForegroundColor Cyan

$files = Get-ChildItem -Recurse -Include '*.js','*.jsx','*.json','*.yml','*.yaml','*.md' | 
    Where-Object { 
        $_.FullName -notlike '*node_modules*' -and 
        $_.FullName -notlike '*.venv*' -and 
        $_.FullName -notlike '*.git*' -and
        $_.FullName -notlike '*offline-packages*'
    }

$changesMade = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace localhost references
    $content = $content -replace 'localhost([^/]*)', 'internal.headyio.com$1'
    $content = $content -replace '127\.0\.0\.1', 'internal.headyio.com'
    $content = $content -replace '\.onrender\.com', 'headysystems.com'
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($file.FullName.Replace((Get-Location).Path, ''))" -ForegroundColor Green
        $changesMade++
    }
}

Write-Host "🎯 Complete! Updated $changesMade files" -ForegroundColor Yellow
if ($changesMade -eq 0) {
    Write-Host "  No localhost or .onrender.com references found" -ForegroundColor Gray
}
