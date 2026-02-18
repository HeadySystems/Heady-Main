<# HEADY_BRAND:BEGIN
<# ╔══════════════════════════════════════════════════════════════════╗
<# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<# ║                                                                  ║
<# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<# ║  FILE: scripts/create_bootable_drive.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
<<<<<<< HEAD
# Ventoy Installation Script — Supports Armor 700 and SanDisk drives
# Usage:
#   .\scripts\create_bootable_drive.ps1                     # Auto-detect Armor 700
#   .\scripts\create_bootable_drive.ps1 -Target Armor       # Explicitly target Armor
#   .\scripts\create_bootable_drive.ps1 -Target SanDisk     # Target SanDisk 32GB
#   .\scripts\create_bootable_drive.ps1 -DriveLetter "E:"   # Target specific letter
#   .\scripts\create_bootable_drive.ps1 -UpdateOnly         # Update Ventoy boot files only (no format)

param(
    [string]$DriveLetter,
    [ValidateSet("Armor", "SanDisk", "Auto")]
    [string]$Target = "Auto",
    [switch]$UpdateOnly,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HEADY BOOTABLE DRIVE SETUP — Ventoy Multi-Boot          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ─── Auto-detect target drive ────────────────────────────────────────────────

function Find-TargetDisk {
    param([string]$TargetName)

    $disks = Get-PhysicalDisk | Where-Object { $_.BusType -eq 'USB' }
    if (-not $disks) {
        Write-Host "ERROR: No USB drives found." -ForegroundColor Red
        exit 1
    }

    Write-Host "Detected USB drives:" -ForegroundColor Yellow
    foreach ($d in $disks) {
        $sizeGB = [math]::Round($d.Size / 1GB, 1)
        Write-Host "  - $($d.FriendlyName) ($($sizeGB)GB) [Disk $($d.DeviceId)]" -ForegroundColor White
    }
    Write-Host ""

    switch ($TargetName) {
        "Armor" {
            $disk = $disks | Where-Object { $_.FriendlyName -like '*ARMOR*' }
            if (-not $disk) { Write-Host "ERROR: Lexar ARMOR 700 not found." -ForegroundColor Red; exit 1 }
            return $disk
        }
        "SanDisk" {
            $disk = $disks | Where-Object { $_.FriendlyName -like '*SanDisk*' }
            if (-not $disk) { Write-Host "ERROR: SanDisk drive not found." -ForegroundColor Red; exit 1 }
            return $disk
        }
        "Auto" {
            $armor = $disks | Where-Object { $_.FriendlyName -like '*ARMOR*' }
            if ($armor) {
                Write-Host "Auto-detected: Lexar ARMOR 700" -ForegroundColor Green
                return $armor
            }
            $sandisk = $disks | Where-Object { $_.FriendlyName -like '*SanDisk*' }
            if ($sandisk) {
                Write-Host "Auto-detected: SanDisk" -ForegroundColor Green
                return $sandisk
            }
            Write-Host "Auto-detect failed. Specify -Target Armor or -Target SanDisk" -ForegroundColor Red
            exit 1
        }
    }
}

# ─── Resolve drive letter ───────────────────────────────────────────────────

if (-not $DriveLetter) {
    $targetDisk = Find-TargetDisk -TargetName $Target
    $diskNumber = $targetDisk.DeviceId
    $partitions = Get-Disk -Number $diskNumber | Get-Partition -ErrorAction SilentlyContinue

    # Find existing data partition letter
    $dataPartition = $partitions | Where-Object { $_.Size -gt 1GB -and $_.DriveLetter }
    if ($dataPartition) {
        $DriveLetter = "$($dataPartition.DriveLetter):"
    } else {
        # No letter assigned — Ventoy needs a physical disk number, not a letter
        Write-Host "Target disk: PhysicalDrive$diskNumber ($($targetDisk.FriendlyName))" -ForegroundColor Yellow
    }
}

$sizeGB = if ($targetDisk) { [math]::Round($targetDisk.Size / 1GB, 1) } else { "?" }
Write-Host "Target: $($targetDisk.FriendlyName) ($($sizeGB)GB)" -ForegroundColor Cyan

# ─── Safety confirmation ────────────────────────────────────────────────────

if (-not $UpdateOnly -and -not $Force) {
    Write-Host ""
    Write-Host "WARNING: Fresh Ventoy install will REFORMAT the drive!" -ForegroundColor Red
    Write-Host "All data on the drive will be LOST." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Type 'YES' to continue, or 'UPDATE' to only update boot files"
    if ($confirm -eq "UPDATE") { $UpdateOnly = $true }
    elseif ($confirm -ne "YES") { Write-Host "Aborted."; exit 0 }
}

# ─── Ventoy paths ───────────────────────────────────────────────────────────

$ventoyUrl = 'https://github.com/ventoy/Ventoy/releases/download/v1.0.96/ventoy-1.0.96-windows.zip'
$localIsoPath = "$env:USERPROFILE\Heady\distribution\iso"
$ventoyDir = "$env:USERPROFILE\Heady\ventoy\ventoy-1.0.96"
$downloadPath = "$env:USERPROFILE\Heady\ventoy\ventoy.zip"

# Ensure Ventoy is extracted
if (-not (Test-Path "$ventoyDir\Ventoy2Disk.exe")) {
    if (-not (Test-Path $downloadPath)) {
        Write-Host "Downloading Ventoy 1.0.96..." -ForegroundColor Yellow
        Invoke-WebRequest -TimeoutSec 120 $ventoyUrl -OutFile $downloadPath
    }
    Write-Host "Extracting Ventoy..." -ForegroundColor Yellow
    Expand-Archive $downloadPath -DestinationPath "$env:USERPROFILE\Heady\ventoy" -Force
}

if (-not (Test-Path "$ventoyDir\Ventoy2Disk.exe")) {
    Write-Host "ERROR: Ventoy2Disk.exe not found at $ventoyDir" -ForegroundColor Red
    exit 1
}

# ─── Install or Update Ventoy ───────────────────────────────────────────────

if ($UpdateOnly) {
    Write-Host "`nUpdating Ventoy boot files (preserving data)..." -ForegroundColor Green
    $ventoyArgs = "-u -n PhysicalDrive$diskNumber"
} else {
    Write-Host "`nInstalling Ventoy (fresh install)..." -ForegroundColor Green
    $ventoyArgs = "-i -n PhysicalDrive$diskNumber"
}

Write-Host "Running: Ventoy2Disk.exe $ventoyArgs" -ForegroundColor DarkGray
Start-Process -FilePath "$ventoyDir\Ventoy2Disk.exe" -ArgumentList $ventoyArgs -Wait
Start-Sleep -Seconds 3

# ─── Wait for drive to re-mount ─────────────────────────────────────────────

Write-Host "Waiting for drive to mount..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
$newPartitions = $null
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    $newPartitions = Get-Disk -Number $diskNumber -ErrorAction SilentlyContinue | Get-Partition -ErrorAction SilentlyContinue
    $dataP = $newPartitions | Where-Object { $_.Size -gt 1GB -and $_.DriveLetter }
    if ($dataP) {
        $DriveLetter = "$($dataP.DriveLetter):"
        Write-Host "Drive mounted at $DriveLetter" -ForegroundColor Green
        break
    }
}

if (-not $DriveLetter -or -not (Test-Path "$DriveLetter\")) {
    Write-Host "WARNING: Drive did not auto-mount. Check Disk Management." -ForegroundColor Yellow
    Write-Host "You may need to assign a drive letter manually." -ForegroundColor Yellow
    exit 1
}

# ─── Create folder structure ────────────────────────────────────────────────

$isoPath = "$DriveLetter\ISOs"
$dropzonePath = "$DriveLetter\Dropzone"
$headyPath = "$DriveLetter\HeadyOS"

foreach ($dir in @($isoPath, $dropzonePath, $headyPath)) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor DarkGray
    }
}

# ─── Create local ISO directory ─────────────────────────────────────────────

if (-not (Test-Path $localIsoPath)) {
    New-Item -Path $localIsoPath -ItemType Directory -Force | Out-Null
}

# ─── Download ISOs ──────────────────────────────────────────────────────────

$isos = @{
    'Ubuntu-24.04'  = 'https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-desktop-amd64.iso'
    'Parrot-6.2'    = 'https://download.parrot.sh/parrot/iso/6.2/Parrot-security-6.2_amd64.iso'
}

Write-Host "`nChecking ISOs..." -ForegroundColor Yellow
foreach ($osName in $isos.Keys) {
    $isoFile = Join-Path $localIsoPath "$osName.iso"
    if (-not (Test-Path $isoFile)) {
        Write-Host "  Downloading $osName ISO (this may take a while)..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri $isos[$osName] -OutFile $isoFile -TimeoutSec 600
            Write-Host "  Downloaded: $osName" -ForegroundColor Green
        } catch {
            Write-Host "  FAILED to download $osName : $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  Already have: $osName" -ForegroundColor DarkGray
=======
# Ventoy Installation Script
param(
    [string]$driveLetter = "D:"
)

$ventoyUrl = 'https://github.com/ventoy/Ventoy/releases/download/v1.0.96/ventoy-1.0.96-windows.zip'
$isoPath = "${driveLetter}\\ISOs"
$dropzonePath = "${driveLetter}\\Dropzone"
$localIsoPath = "$env:USERPROFILE\Heady\distribution\iso"
$ventoyDir = "$env:USERPROFILE\Heady\ventoy"
$downloadPath = "$env:USERPROFILE\Heady\ventoy\ventoy.zip"

# Create local ISO directory if not exists
if (-not (Test-Path $localIsoPath)) {
    Write-Host "Creating local ISO directory at $localIsoPath"
    New-Item -Path $localIsoPath -ItemType Directory -Force
}

# Download and install Ventoy
Invoke-WebRequest -TimeoutSec 10 $ventoyUrl -OutFile $downloadPath
Expand-Archive $downloadPath -DestinationPath $ventoyDir -Force
if (-not (Test-Path "$ventoyDir\\Ventoy2Disk.exe")) {
    Write-Host "Error: Ventoy2Disk.exe not found at $ventoyDir"
    exit 1
}
Start-Process -FilePath "$ventoyDir\\Ventoy2Disk.exe" -ArgumentList "/I /G ${driveLetter}" -Wait

# Create folder structure on the USB drive
if (-not (Test-Path $isoPath)) {
    Write-Host "Creating ISO directory on USB drive: $isoPath"
    New-Item -Path $isoPath -ItemType Directory -Force
}
if (-not (Test-Path $dropzonePath)) {
    Write-Host "Creating Dropzone directory on USB drive: $dropzonePath"
    New-Item -Path $dropzonePath -ItemType Directory -Force
}

# Download ISOs
$isos = @{
    'Ubuntu' = 'https://releases.ubuntu.com/22.04.3/ubuntu-22.04.3-desktop-amd64.iso'
    'Parrot' = 'https://download.parrot.sh/parrot/iso/5.1/Parrot-security-5.1_amd64.iso'
}

foreach ($os in $isos.Keys) {
    $isoFile = "${localIsoPath}\\${os}.iso"
    if (-not (Test-Path $isoFile)) {
        Write-Host "Downloading $os ISO..."
        Invoke-WebRequest -TimeoutSec 10 $isos[$os] -OutFile $isoFile
>>>>>>> a3d7d06c432bf92df85e53f8d0cf1e6c8622ccea
    }
}

# Copy HeadyOS ISO if exists
$headyIso = "$env:USERPROFILE\Heady\distribution\HeadyOS.iso"
if (Test-Path $headyIso) {
<<<<<<< HEAD
    $dest = Join-Path $localIsoPath "HeadyOS.iso"
    if (-not (Test-Path $dest)) {
        Copy-Item -Path $headyIso -Destination $dest
        Write-Host "  Copied HeadyOS ISO" -ForegroundColor Green
    }
}

# ─── Copy ISOs to drive ────────────────────────────────────────────────────

Write-Host "`nCopying ISOs to $isoPath ..." -ForegroundColor Yellow
$localIsos = Get-ChildItem "$localIsoPath\*.iso" -ErrorAction SilentlyContinue
foreach ($iso in $localIsos) {
    $dest = Join-Path $isoPath $iso.Name
    if (-not (Test-Path $dest)) {
        Write-Host "  Copying $($iso.Name) ($([math]::Round($iso.Length / 1GB, 1))GB)..." -ForegroundColor White
        Copy-Item -Path $iso.FullName -Destination $dest
    } else {
        Write-Host "  Already on drive: $($iso.Name)" -ForegroundColor DarkGray
    }
}

# ─── Ventoy theme/config ───────────────────────────────────────────────────

$ventoyJsonPath = "$DriveLetter\ventoy\ventoy.json"
$ventoyConfigDir = "$DriveLetter\ventoy"
if (-not (Test-Path $ventoyConfigDir)) {
    New-Item -Path $ventoyConfigDir -ItemType Directory -Force | Out-Null
}

$ventoyConfig = @'
{
    "control": [
        { "VTOY_DEFAULT_SEARCH_ROOT": "/ISOs" },
        { "VTOY_MENU_TIMEOUT": "0" }
    ],
    "theme": {
        "display_mode": "CLI",
        "gfxmode": "1920x1080"
    }
}
'@
Set-Content -Path $ventoyJsonPath -Value $ventoyConfig -Force
Write-Host "  Created Ventoy config: $ventoyJsonPath" -ForegroundColor DarkGray

# ─── Summary ────────────────────────────────────────────────────────────────

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "BOOTABLE DRIVE SETUP COMPLETE" -ForegroundColor Green
Write-Host "  Drive:  $DriveLetter ($($targetDisk.FriendlyName))" -ForegroundColor White
Write-Host "  ISOs:   $isoPath" -ForegroundColor White
Write-Host "  Mode:   $(if ($UpdateOnly) { 'Update (data preserved)' } else { 'Fresh install' })" -ForegroundColor White
Write-Host ""
Write-Host "To boot: Restart PC -> Enter BIOS (F2/Del) -> Set USB boot priority" -ForegroundColor Yellow
Write-Host "  UEFI: Select 'UEFI: $($targetDisk.FriendlyName)'" -ForegroundColor Yellow
Write-Host "  Legacy: Select '$($targetDisk.FriendlyName)'" -ForegroundColor Yellow
Write-Host ""
=======
    Write-Host "Copying HeadyOS ISO..."
    Copy-Item -Path $headyIso -Destination "${localIsoPath}\\HeadyOS.iso"
}

# Copy ISO files from local distribution directory to USB
Write-Host "Copying ISO files to USB drive..."
Copy-Item -Path "${localIsoPath}\\*" -Destination $isoPath -Recurse

Write-Host 'Bootable drive setup complete! Added Ubuntu, ParrotOS, and HeadyOS.' -ForegroundColor Green
>>>>>>> a3d7d06c432bf92df85e53f8d0cf1e6c8622ccea
