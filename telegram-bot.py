#!/usr/bin/env python3
"""
Telegram RPS Bot - Python implementation
Since Node.js is having connection issues, this is a working alternative
"""

import logging
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok'

# Game state storage
active_games = {}
user_games = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /start is issued."""
    await update.message.reply_text(
        '🎮 Welcome to RPS Tournament Bot!\n\n'
        'Commands:\n'
        '/play - Start a quick match\n'
        '/join - Join an existing game\n'
        '/stats - View your statistics\n'
        '/help - Show this help message'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /help is issued."""
    await update.message.reply_text(
        '🎮 RPS Tournament Bot Help\n\n'
        '**Game Commands:**\n'
        '/play - Create a new quick match\n'
        '/join - Join an available game\n'
        '/rock - Choose rock 🪨\n'
        '/paper - Choose paper 📄\n'
        '/scissors - Choose scissors ✂️\n\n'
        '**Info Commands:**\n'
        '/stats - View your game statistics\n'
        '/help - Show this help message\n\n'
        '**How to Play:**\n'
        '1. Use /play to create a game\n'
        '2. Share the game ID with a friend\n'
        '3. Friend uses /join to join\n'
        '4. Both players choose moves\n'
        '5. Best of 3 rounds wins!'
    )

async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Create a new game."""
    import uuid
    game_id = str(uuid.uuid4())[:8]
    user_id = update.effective_user.id
    
    active_games[game_id] = {
        'player1': user_id,
        'player2': None,
        'player1_move': None,
        'player2_move': None,
        'status': 'waiting'
    }
    
    user_games[user_id] = game_id
    
    await update.message.reply_text(
        f'🎮 Quick match created! Game ID: `{game_id}`\n\n'
        '🔍 Waiting for another player to join...\n'
        'Share this message with a friend or use /join in another chat!'
    )

async def join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Join an existing game."""
    user_id = update.effective_user.id
    
    # Find available game
    available_game = None
    for game_id, game in active_games.items():
        if game['status'] == 'waiting' and game['player1'] != user_id:
            available_game = game_id
            break
    
    if not available_game:
        await update.message.reply_text(
            '❌ No available games found. Use /play to create a new game!'
        )
        return
    
    active_games[available_game]['player2'] = user_id
    active_games[available_game]['status'] = 'active'
    user_games[user_id] = available_game
    
    await update.message.reply_text(
        f'⚔️ Game joined!\n\n'
        '🎯 Choose your move:\n'
        '/rock 🪨\n'
        '/paper 📄\n'
        '/scissors ✂️'
    )

async def rock(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await make_move(update, 'rock')

async def paper(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await make_move(update, 'paper')

async def scissors(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await make_move(update, 'scissors')

async def make_move(update: Update, move: str):
    """Process a game move."""
    user_id = update.effective_user.id
    
    if user_id not in user_games:
        await update.message.reply_text(
            '❌ You are not in an active game. Use /play or /join first!'
        )
        return
    
    game_id = user_games[user_id]
    game = active_games.get(game_id)
    
    if not game:
        await update.message.reply_text('❌ Game not found!')
        return
    
    # Set the player's move
    if game['player1'] == user_id:
        game['player1_move'] = move
    else:
        game['player2_move'] = move
    
    move_emoji = {'rock': '🪨', 'paper': '📄', 'scissors': '✂️'}
    await update.message.reply_text(f'✅ You chose {move_emoji[move]} {move}!')
    
    # Check if both players have moved
    if game['player1_move'] and game['player2_move']:
        # Determine winner
        p1_move = game['player1_move']
        p2_move = game['player2_move']
        
        if p1_move == p2_move:
            result = "🤝 It's a draw!"
        elif (
            (p1_move == 'rock' and p2_move == 'scissors') or
            (p1_move == 'paper' and p2_move == 'rock') or
            (p1_move == 'scissors' and p2_move == 'paper')
        ):
            result = '🎉 Player 1 wins!'
        else:
            result = '🎉 Player 2 wins!'
        
        await update.message.reply_text(
            f'🎯 Game Result:\n'
            f'Player 1: {move_emoji[p1_move]} {p1_move}\n'
            f'Player 2: {move_emoji[p2_move]} {p2_move}\n\n'
            f'{result}\n\n'
            'Play again with /play!'
        )
        
        # Clean up game
        del active_games[game_id]
        del user_games[game['player1']]
        if game['player2'] in user_games:
            del user_games[game['player2']]
    else:
        await update.message.reply_text('⏳ Waiting for your opponent to make their move...')

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show player statistics."""
    await update.message.reply_text(
        '📊 Your Statistics:\n\n'
        '🎮 Total Games: 0\n'
        '🏆 Wins: 0\n'
        '💔 Losses: 0\n'
        '🤝 Draws: 0\n'
        '📈 Win Rate: 0%\n\n'
        '(Stats tracking coming soon!)'
    )

def main():
    """Start the bot."""
    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()

    # Register command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("play", play))
    application.add_handler(CommandHandler("join", join))
    application.add_handler(CommandHandler("rock", rock))
    application.add_handler(CommandHandler("paper", paper))
    application.add_handler(CommandHandler("scissors", scissors))
    application.add_handler(CommandHandler("stats", stats))

    # Run the bot
    print("✅ Bot is starting...")
    application.run_polling()

if __name__ == '__main__':
    # First test the connection
    try:
        response = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getMe')
        data = response.json()
        if data['ok']:
            print(f"✅ Bot verified: @{data['result']['username']}")
            print("Starting bot polling...")
            main()
        else:
            print("❌ Bot token is invalid!")
    except Exception as e:
        print(f"❌ Connection error: {e}")