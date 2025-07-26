# 🎮 Bot Testing Guide for @MWOR_QuizBot

## ✅ Bot Status
- **Bot Username**: @MWOR_QuizBot
- **Bot Name**: MWOR_QuizBot
- **Status**: Running and connected ✅

## 🚀 How to Test the Bot

### 1. Open Telegram
Open Telegram on your phone or desktop

### 2. Find the Bot
Search for: **@MWOR_QuizBot**

### 3. Start Conversation
Click "Start" or send `/start`

### 4. Test Commands

#### Basic Commands:
- `/start` - Register and see welcome message
- `/help` - View all available commands
- `/play` - Create a new game
- `/join` - Join an available game
- `/stats` - View your statistics

#### Game Commands (after starting a game):
- `/rock` - Choose rock
- `/paper` - Choose paper
- `/scissors` - Choose scissors

### 5. Test Game Flow

1. **Single Player Test**:
   - Send `/play` to create a game
   - The bot will create a game and wait for another player
   - From another Telegram account (or ask a friend), search for @MWOR_QuizBot
   - Send `/join` from the second account
   - Both players choose their moves
   - See the result!

2. **Quick Test (with yourself)**:
   - You'll need two Telegram accounts or a friend to help
   - Account 1: `/play`
   - Account 2: `/join`
   - Account 1: `/rock`
   - Account 2: `/scissors`
   - Both accounts see the result!

## 🔍 Verify Bot is Working

Run this command to check for recent messages:
```bash
curl -s "https://api.telegram.org/bot8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok/getUpdates" | jq
```

## 📊 Check Application Status

1. **API Health Check**:
```bash
curl http://localhost:3000/api/v1/ping
```

2. **View Logs**:
```bash
# In the terminal running the app, you should see:
# - User registrations
# - Game creations
# - Move submissions
```

3. **Database Check**:
```bash
# View game data
sqlite3 ./data/gamebot.db "SELECT * FROM games;"

# View user data
sqlite3 ./data/gamebot.db "SELECT * FROM users;"
```

## 🎯 Expected Bot Behavior

When you send `/start`:
```
🎮 Welcome to Rock Paper Scissors Bot!

You're all set up and ready to play!

Commands:
/play - Start a new game
/join - Join an available game
/stats - View your statistics
/help - Show this help message
```

When you send `/play`:
```
🎯 Game created! Waiting for an opponent...

Share this with a friend or wait for someone to join!
Game ID: [UUID]

To join this game, players can use /join
```

## 🚨 Troubleshooting

If the bot doesn't respond:

1. **Check if app is running**:
```bash
ps aux | grep nest
```

2. **Check logs**:
```bash
# Look for "Telegram bot started successfully" in the app output
```

3. **Verify token**:
```bash
curl https://api.telegram.org/bot8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok/getMe
```

4. **Restart the app**:
```bash
# Stop with Ctrl+C in the terminal
# Start again with:
npm run start:dev
```

---

**Ready to test!** Open Telegram and message @MWOR_QuizBot