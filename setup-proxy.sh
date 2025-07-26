#!/bin/bash

# Setup proxy for Telegram bot
echo "🔧 Telegram Bot Proxy Setup"
echo "=========================="
echo ""
echo "If you have a proxy server, set these environment variables:"
echo ""
echo "export HTTPS_PROXY=http://your-proxy-server:port"
echo "export HTTP_PROXY=http://your-proxy-server:port"
echo "export https_proxy=http://your-proxy-server:port"
echo "export http_proxy=http://your-proxy-server:port"
echo ""
echo "Example with SOCKS5 proxy:"
echo "export HTTPS_PROXY=socks5://127.0.0.1:1080"
echo ""
echo "Then run: npm run start:dev"