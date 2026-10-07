@echo off
rem ZCode RTL - starts ZCode with a DevTools port and injects the RTL stylesheet.
rem Portable: works from any folder, no configuration needed.

setlocal
set "PORT=9222"

rem --- locate ZCode.exe in standard install paths ---
set "EXE="
if not defined EXE if exist "%ProgramFiles%\ZCode\ZCode.exe" set "EXE=%ProgramFiles%\ZCode\ZCode.exe"
if not defined EXE if exist "%ProgramFiles(x86)%\ZCode\ZCode.exe" set "EXE=%ProgramFiles(x86)%\ZCode\ZCode.exe"
if not defined EXE if exist "%LocalAppData%\Programs\ZCode\ZCode.exe" set "EXE=%LocalAppData%\Programs\ZCode\ZCode.exe"

if not defined EXE (
  echo [ZCode RTL] ZCode.exe not found in standard locations.
  echo             Install ZCode first, or edit this file to hardcode its path.
  pause
  exit /b 1
)

start "" "%EXE%" --remote-debugging-port=%PORT%
wscript.exe "%~dp0hidden.vbs" "%~dp0injector.mjs"
