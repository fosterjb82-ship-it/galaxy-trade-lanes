#!/bin/bash
# Mac: double-click to open an online Smugglers Run table (needs Node.js; cloudflared for the public link).
cd "$(dirname "$0")"
node server/server.js
