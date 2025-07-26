#!/bin/bash

# Test Bot API Endpoints
API_BASE="http://localhost:3000/api/v1"

echo "🤖 Testing Bot API Endpoints"
echo "============================"
echo ""

# Check bot health
echo "1. Checking bot health..."
curl -s "${API_BASE}/bot/health" | jq '.'
echo ""

# Test /start command
echo "2. Testing /start command..."
curl -s -X POST "${API_BASE}/bot/test/start" \
  -H "Content-Type: application/json" \
  -d '{"username": "player1"}' | jq '.'
echo ""

# Test /help command
echo "3. Testing /help command..."
curl -s -X POST "${API_BASE}/bot/test/help" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test /play command
echo "4. Creating a game with /play..."
GAME_RESPONSE=$(curl -s -X POST "${API_BASE}/bot/test/play" \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 111111, "username": "player1"}')
echo "$GAME_RESPONSE" | jq '.'

# Extract game ID from response
GAME_ID=$(echo "$GAME_RESPONSE" | jq -r '.response' | grep -oP 'Game ID: \K[a-zA-Z0-9-]+')
echo "Game ID: $GAME_ID"
echo ""

# Test /join command with player 2
echo "5. Player 2 joining the game..."
curl -s -X POST "${API_BASE}/bot/test/join" \
  -H "Content-Type: application/json" \
  -d "{\"telegramId\": 222222, \"username\": \"player2\", \"args\": [\"$GAME_ID\"]}" | jq '.'
echo ""

# Test move commands
echo "6. Player 1 choosing rock..."
curl -s -X POST "${API_BASE}/bot/command" \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 111111, "username": "player1", "command": "/rock"}' | jq '.'
echo ""

echo "7. Player 2 choosing paper..."
curl -s -X POST "${API_BASE}/bot/command" \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 222222, "username": "player2", "command": "/paper"}' | jq '.'
echo ""

# Test /stats command
echo "8. Checking player 1 stats..."
curl -s -X POST "${API_BASE}/bot/test/stats" \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 111111, "username": "player1"}' | jq '.'
echo ""

echo "✅ Bot API tests completed!"