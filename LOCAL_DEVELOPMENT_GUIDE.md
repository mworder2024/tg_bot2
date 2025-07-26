# Local Development Without Telegram Access

Since your network blocks Telegram, here are ways to develop locally:

## 1. Skip Bot Mode (Recommended)

Use the API-only mode for local development:

```bash
# Create .env.development file (already created)
SKIP_BOT=true
NODE_ENV=development

# Run the application
npm run start:dev
```

The app will run without the Telegram bot, allowing you to:
- Develop and test the REST API
- Work on game logic
- Test database operations
- Build the web interface

## 2. Test Bot Logic Without Telegram

Use the mock bot service for testing bot commands:

```bash
# Run in test mode
npm test

# Or use the CLI game
npm run cli
```

## 3. API Endpoints for Testing

With SKIP_BOT=true, test via REST API:

```bash
# Health check
curl http://localhost:3000/api/v1/ping

# Create user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 123456, "username": "testuser"}'

# Start game
curl -X POST http://localhost:3000/api/v1/games \
  -H "Content-Type: application/json" \
  -d '{"player1Id": "123", "player2Id": "456"}'
```

## 4. Development Workflow

1. **Local Development**: Work on features with SKIP_BOT=true
2. **Test Locally**: Use REST API and unit tests
3. **Push to GitHub**: Commit your changes
4. **Test on Railway**: The bot works there without restrictions
5. **Verify**: Check Railway logs for bot functionality

## 5. Using Postman/Insomnia

Import this collection for API testing:

```json
{
  "info": {
    "name": "RPS Tournament Bot API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/v1/ping"
      }
    },
    {
      "name": "Create User",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/v1/users",
        "body": {
          "mode": "raw",
          "raw": "{\"telegramId\": 123456, \"username\": \"testuser\"}"
        }
      }
    }
  ]
}
```

## 6. Alternative: Ngrok for Webhooks

If you get Telegram access later:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run start:dev

# In another terminal
ngrok http 3000

# Use the ngrok URL for webhook mode
```

## 7. Production Testing

Since Railway works without restrictions:
1. Push changes: `git push origin main`
2. Check Railway logs for bot behavior
3. Test the actual bot on Telegram via Railway

This workflow lets you develop locally and test the Telegram integration on Railway.