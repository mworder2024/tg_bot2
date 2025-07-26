#!/bin/bash

echo "🚀 Starting the Telegram RPS Tournament Bot..."
echo "=========================================="
echo ""

# Start the bot in the background
npm run start:dev &
BOT_PID=$!

echo "Bot started with PID: $BOT_PID"
echo "Waiting for bot to initialize..."
sleep 10

# Test if the bot is responsive
echo ""
echo "🧪 Testing bot connection..."
node test-bot.js

echo ""
echo "📝 Bot is running. You can now:"
echo "- Open Telegram and search for @MWOR_QuizBot"
echo "- Send /start to begin"
echo "- Use /help to see all commands"
echo ""
echo "Press Ctrl+C to stop the bot."

# Keep the script running
wait $BOT_PID