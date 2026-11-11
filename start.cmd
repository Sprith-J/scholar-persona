@echo off
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\hermes\node\node.exe" (
  "%LOCALAPPDATA%\hermes\node\node.exe" --env-file-if-exists=.env server.mjs --open
) else (
  node --env-file-if-exists=.env server.mjs --open
)
