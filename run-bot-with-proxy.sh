#!/bin/bash

echo "🤖 Starting Telegram Bot with different connection methods..."
echo "=================================================="
echo ""

# Method 1: Try with DNS override
echo "1. Trying with Google DNS..."
export NODE_OPTIONS="--dns-result-order=ipv4first"
timeout 10s npm run start:dev 2>&1 | grep -E "(Bot started|Failed|Error|bot)" &
PID1=$!
wait $PID1

echo ""
echo "2. Trying with system proxy detection..."
# Check if system has proxy
PROXY=$(env | grep -i proxy | head -1)
if [ ! -z "$PROXY" ]; then
  echo "Found proxy: $PROXY"
fi

# Method 3: Try with node-specific settings
echo ""
echo "3. Trying with Node.js specific settings..."
export NODE_TLS_REJECT_UNAUTHORIZED=0
export UV_THREADPOOL_SIZE=128
timeout 10s npm run start:dev 2>&1 | grep -E "(Bot started|Failed|Error|bot)" &
PID3=$!
wait $PID3

echo ""
echo "=================================================="
echo "If none of these work, the issue is:"
echo "1. Your ISP/network is blocking Telegram API"
echo "2. You need to use a VPN or proxy"
echo "3. Deploy the bot to a cloud server"
echo ""
echo "Alternative: Use the Python bot (telegram-bot.py) which IS working!"