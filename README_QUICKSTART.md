# 🎮 RPS Tournament Bot - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment
```bash
# The .env file is already created with SQLite configuration
# For Telegram bot, update BOT_TOKEN in .env file
```

### 3. Run the Game

#### Option A: CLI Mode (for testing)
```bash
npm run cli
```

#### Option B: Full Server with Telegram Bot
```bash
npm run start:dev
```

## 🎯 CLI Game Instructions

1. **Start CLI**: `npm run cli`
2. **Create Players**: Choose option 1 to create test players
3. **Play Game**: Choose option 2 to start a match
4. **View Stats**: Choose option 3 to see player statistics

## 🤖 Telegram Bot Setup

1. **Get Bot Token**:
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Copy the token

2. **Update Configuration**:
   ```bash
   # Edit .env file
   BOT_TOKEN=your_actual_bot_token_here
   ```

3. **Start Server**:
   ```bash
   npm run start:dev
   ```

4. **Use Bot Commands**:
   - `/start` - Register and get help
   - `/play` - Create a new game
   - `/join` - Join an existing game
   - `/rock`, `/paper`, `/scissors` - Make moves
   - `/stats` - View your statistics

## 🎮 Game Flow

### Quick Match
1. Player 1 uses `/play` to create game
2. Player 2 uses `/join` to join available game
3. Both players choose moves using `/rock`, `/paper`, or `/scissors`
4. Best of 3 rounds wins!

### CLI Testing
1. Create test players
2. Start quick match
3. Both players choose moves interactively
4. View results and statistics

## 🏗️ Architecture

- **SQLite Database**: Local file-based database
- **TypeORM**: Database ORM with entity management
- **NestJS**: Modern Node.js framework
- **Grammy**: Telegram bot framework
- **CLI Interface**: Command-line testing interface

## 📊 Features

✅ **Working Now**:
- Rock-Paper-Scissors game logic
- User registration and management
- Game creation and joining
- Move submission and validation
- Statistics tracking
- CLI testing interface
- Basic Telegram bot

🔄 **Coming Soon**:
- Tournament brackets
- Multiple concurrent games
- Advanced statistics
- Web dashboard
- Redis caching
- Message queues

## 🐛 Troubleshooting

### Common Issues

**"Database connection failed"**
- Ensure `data/` directory exists
- Check `.env` file configuration

**"Bot token invalid"**
- Get a new token from @BotFather
- Update `BOT_TOKEN` in `.env`

**"Module not found"**
- Run `npm install` to install dependencies
- Ensure you're in the project directory

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:cov
```

## 📝 Next Steps

1. **Test the CLI**: Use `npm run cli` to verify game logic
2. **Set up Telegram**: Add your bot token and test commands
3. **Add Friends**: Invite others to play via Telegram
4. **Check Stats**: Monitor game statistics
5. **Scale Up**: Add tournaments and advanced features

**Have fun playing Rock-Paper-Scissors! 🎉**