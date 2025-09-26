<#
PowerShell helper to download & install nvm-windows and then install/use a Node.js version.
Usage (interactive):
  - Run in an elevated PowerShell (recommended):
    ./scripts/install_nvm_windows.ps1

Usage (non-interactive attempt):
  - To auto-run the nvm installer elevated and install Node version automatically (you will be prompted for UAC):
    ./scripts/install_nvm_windows.ps1 -AutoInstall

Parameters:
  -AutoInstall : Attempt to run the downloaded nvm installer with elevation.
  -NodeVersion : Node version to install (default: 18.20.0). Provide exact version string.

Notes:
- The script downloads https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe
  then optionally runs it. The installer is interactive; AutoInstall uses Start-Process -Verb RunAs (UAC)
- After running the installer you'll typically need to open a new PowerShell session to pick up nvm on PATH.
- If you prefer, run the downloaded installer manually.
#>

param(
    [switch]$AutoInstall,
    [string]$NodeVersion = "18.20.0"
)

function Assert-Windows {
    if ($env:OS -notlike "*Windows*") {
        Write-Error "This script must be run on Windows PowerShell. Exiting."
        exit 2
    }
}

Assert-Windows

$installerUrl = "https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe"
$installerPath = Join-Path $env:TEMP "nvm-setup.exe"

Write-Host "Downloading nvm-windows installer to: $installerPath ..."
try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing -ErrorAction Stop
    Write-Host "Downloaded installer."
} catch {
    Write-Error "Failed to download nvm-windows installer: $_"
    exit 3
}

if ($AutoInstall) {
    Write-Host "Attempting to run the installer elevated (you will be prompted for UAC)..."
    try {
        Start-Process -FilePath $installerPath -Verb RunAs -Wait -ErrorAction Stop
        Write-Host "Installer finished."
    } catch {
        Write-Error "Failed to launch installer with elevation: $_"
        Write-Host "You can run the installer manually: $installerPath"
        exit 4
    }
} else {
    Write-Host "Installer downloaded to: $installerPath"
    Write-Host "Please run this installer now (right-click -> Run as administrator) and complete the nvm-windows installation."
    Read-Host "Press Enter after you have installed nvm-windows (or Ctrl+C to abort)"
}

# After installer: nvm should be available in PATH in a fresh shell. Try to detect nvm now.
$maxRetries = 6
$retry = 0
while ($retry -lt $maxRetries) {
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        break
    }
    $retry++
    Write-Host "nvm not found in PATH yet. If you just installed nvm, open a new PowerShell and re-run this script or wait... (attempt $retry/$maxRetries)"
    Start-Sleep -Seconds 3
}

if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    Write-Warning "nvm.exe was not found in PATH. Please open a new PowerShell window (or restart this shell), then run this script again."
    Write-Host "If nvm is installed but not on PATH, try: where.exe nvm"
    exit 5
}

Write-Host "nvm found. Installing Node $NodeVersion via nvm..."

# Install Node
& nvm install $NodeVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "nvm install failed (exit code $LASTEXITCODE). You may need to pick a different version string or verify nvm installation."
    exit 6
}

# Use the installed version
& nvm use $NodeVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "nvm use failed (exit code $LASTEXITCODE)."
    exit 7
}

# Confirm install
Write-Host "Node/npm/npx versions:"
try {
    node --version
    npm --version
    npx --version
} catch {
    Write-Warning "Could not run node/npm/npx from this shell. Open a new PowerShell to pick up PATH changes, then run 'node --version' to verify."
}

Write-Host "Done. Restart VS Code so it picks up the updated PATH and retry the MCP server."