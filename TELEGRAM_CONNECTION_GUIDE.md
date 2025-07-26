# Telegram Bot Connection Guide

## Connection Issues (ETIMEDOUT)

If you're experiencing `ETIMEDOUT` errors when connecting to Telegram, this is typically due to network restrictions.

## Solutions

### 1. Use a Proxy (Recommended for Development)

Set the `HTTPS_PROXY` environment variable:

```bash
# Example with a free proxy (find working ones online)
export HTTPS_PROXY=http://proxy-server:port
npm run start:dev

# Or in .env file
HTTPS_PROXY=http://proxy-server:port
```

### 2. Use a VPN

Connect to a VPN service that allows Telegram access.

### 3. Deploy to Cloud (Best for Production)

Railway, Heroku, or other cloud services typically don't have these restrictions:

```bash
# Railway deployment works without proxy
git push origin main
```

### 4. Use Webhook Mode (Alternative)

Instead of polling, use webhooks with ngrok for local development:

```bash
# Install ngrok
npm install -g ngrok

# In one terminal, start your app
npm run start:dev

# In another terminal, expose your local server
ngrok http 3000

# Set the webhook URL in your bot configuration
# https://your-ngrok-url.ngrok.io/webhook
```

### 5. Test Connection

Use the test script to verify your setup:

```bash
# Direct test
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe

# With proxy
curl -x http://proxy:port https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

## Environment Variables

Add to your `.env` file:

```env
# Proxy configuration (optional)
HTTPS_PROXY=http://your-proxy:port
HTTP_PROXY=http://your-proxy:port

# Bot configuration
BOT_TOKEN=your_bot_token_here
NODE_ENV=development
```

## Common Issues

1. **ETIMEDOUT**: Network timeout - use proxy or VPN
2. **401 Unauthorized**: Invalid bot token
3. **409 Conflict**: Webhook already set - the bot clears this automatically
4. **Connection refused**: Firewall blocking - check your network settings

## Working Proxy Services

Some options to try:
- Your corporate proxy (if available)
- VPN services with proxy endpoints
- SOCKS5 proxies (requires additional configuration)
- Cloud-based proxy services

## Production Deployment

For production, deploy to a cloud service where Telegram isn't blocked:
- Railway (recommended)
- Heroku
- AWS/GCP/Azure
- DigitalOcean

The bot will work without any proxy configuration on these platforms.