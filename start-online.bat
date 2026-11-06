@echo off
rem Windows: double-click to open an online Galaxy Trade Lanes table (needs Node.js; cloudflared for the public link).
cd /d "%~dp0"
node server\server.js
pause
