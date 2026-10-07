# ZCode RTL - one-click installer
#
#   Install:   powershell -ExecutionPolicy Bypass -File install.ps1
#   One-liner: irm https://raw.githubusercontent.com/ahmadkhanloo/ZCodeRTL/main/install.ps1 | iex
#   Uninstall: powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$repo    = 'https://github.com/ahmadkhanloo/ZCodeRTL'
$dest    = "$env:LOCALAPPDATA\ZCodeRTL"
$desk    = [Environment]::GetFolderPath('Desktop')
$lnkPath = "$desk\ZCode RTL.lnk"

# --- uninstall: remove shortcut + downloaded copy, keep local checkouts ---
if ($Uninstall) {
  if (Test-Path $lnkPath) { Remove-Item $lnkPath -Force; Write-Host "Removed: $lnkPath" }
  if (Test-Path $dest)    { Remove-Item $dest -Recurse -Force; Write-Host "Removed: $dest" }
  Write-Host ''
  Write-Host 'ZCode RTL removed.'
  Write-Host 'If a background node.exe injector is still running it is harmless and stops at next reboot (or kill it in Task Manager).'
  exit 0
}

# --- resolve source: this folder, or a fresh download (one-liner mode) ---
$src = $PSScriptRoot
if (-not (Test-Path (Join-Path $src 'injector.mjs'))) {
  Write-Host 'Downloading ZCodeRTL...'
  $zip = "$env:TEMP\ZCodeRTL.zip"
  Invoke-WebRequest "$repo/archive/refs/heads/main.zip" -OutFile $zip
  $tmp = "$env:TEMP\ZCodeRTL-extract"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip $tmp -Force
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Move-Item (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName $dest
  Remove-Item $tmp -Recurse -Force
  Remove-Item $zip -Force
  $src = $dest
}

# --- requirements: ZCode + Node >= 21 (needs the built-in WebSocket) ---
$exe = "$env:ProgramFiles\ZCode\ZCode.exe",
       "$env:LOCALAPPDATA\Programs\ZCode\ZCode.exe",
       "${env:ProgramFiles(x86)}\ZCode\ZCode.exe" |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { throw 'ZCode.exe not found in standard locations. Install ZCode first.' }

try { $nodeVer = [version]((node --version) -replace '^v', '') }
catch { throw 'Node.js not found on PATH. Install Node 21+ from https://nodejs.org' }
if ($nodeVer.Major -lt 21) { throw "Node >= 21 required (found v$nodeVer)." }

# --- desktop shortcut ---
$ws  = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath      = Join-Path $src 'ZCode-RTL.cmd'
$lnk.IconLocation    = "$exe,0"
$lnk.WorkingDirectory = $src
$lnk.Save()

Write-Host ''
Write-Host 'ZCode RTL installed.'
Write-Host "  App:      $exe"
Write-Host "  Files:    $src"
Write-Host "  Shortcut: $lnkPath"
Write-Host ''
Write-Host 'Next: fully close ZCode (also from the tray), then start it via the "ZCode RTL" shortcut.'
