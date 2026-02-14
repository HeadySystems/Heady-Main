@echo off
echo PURGING ALL VIOLATIONS...

setlocal enabledelayedexpansion

for /r "c:\Users\erich\Heady" %%f in (*.yaml *.yml *.js *.ts *.json *.jsx *.tsx *.md *.html *.css *.conf *.toml *.env* *.ps1 *.sh *.py) do (
    set "file=%%f"
    set "skip=0"
    
    echo Processing: %%~nxf
    
    rem Skip certain directories
    echo !file! | findstr /C:"node_modules" >nul && set skip=1
    echo !file! | findstr /C:".git" >nul && set skip=1
    echo !file! | findstr /C:"dist" >nul && set skip=1
    echo !file! | findstr /C:"AndroidSDK" >nul && set skip=1
    echo !file! | findstr /C:"build" >nul && set skip=1
    
    if !skip! equ 0 (
        powershell -Command "(Get-Content '!file!' -Raw) -replace 'localhost', 'api.headysystems.com' -replace '127.0.0.1', 'api.headysystems.com' -replace '\.onrender\.com', '.headysystems.com' -replace 'heady\.internal', 'headysystems.com' -replace 'heady\.local', 'headysystems.com' -replace '\.internal\.', '.headysystems.com' | Set-Content '!file!'"
    )
)

echo PURGE COMPLETE
pause
