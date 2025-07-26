import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, session, SessionFlavor } from 'grammy';
import { UserService } from '../user/user.service';
import { GameEngineService } from '../../services/game-engine.service';
import { GameMove, GameStatus } from '../../entities/game.entity';

interface SessionData {
  activeGameId?: string;
  waitingForMove?: boolean;
}

type BotContext = Context & SessionFlavor<SessionData>;

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot<BotContext>;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly gameEngineService: GameEngineService,
  ) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>('BOT_TOKEN');
    
    if (!botToken || botToken === 'your_bot_token_here') {
      this.logger.warn('Bot token not configured. Bot will not start.');
      return;
    }

    this.logger.log(`Initializing bot with token: ${botToken.substring(0, 10)}...`);

    try {
      // Try with custom fetch implementation
      const fetch = require('node-fetch');
      const HttpsProxyAgent = require('https-proxy-agent');
      
      this.bot = new Bot<BotContext>(botToken, {
        client: {
          // Increase timeout
          timeoutSeconds: 120,
          // Custom base fetch config
          baseFetchConfig: {
            agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined,
            compress: true,
            timeout: 120000, // 2 minutes
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Telegram Bot)',
            },
          },
          // Allow using local Bot API server if needed
          apiRoot: process.env.BOT_API_ROOT || 'https://api.telegram.org',
        },
      });

      // Session middleware
      this.bot.use(session({ initial: (): SessionData => ({}) }));

      this.setupCommands();
      
      // Add error handling for bot errors
      this.bot.catch((err) => {
        this.logger.error('Bot error:', err);
      });

      // First, try to get bot info to verify connection
      this.logger.log('Testing bot connection...');
      const botInfo = await this.bot.api.getMe();
      this.logger.log(`Bot verified: @${botInfo.username} (${botInfo.first_name})`);

      // Start polling with error handling
      this.bot.start({
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
        onStart: (botInfo) => {
          this.logger.log(`Telegram bot started successfully as @${botInfo.username}`);
        },
      }).catch((error) => {
        this.logger.error('Bot polling error:', error);
      });

      // Don't await the start() as it runs indefinitely
      this.logger.log('Bot polling initiated');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error);
      if (error.description) {
        this.logger.error('Error description:', error.description);
      }
      // Don't throw - let the app continue running
    }
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      try {
        await this.userService.createUser({
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        });

        await ctx.reply(
          '🎮 Welcome to RPS Tournament Bot!\\n\\n' +
          'Commands:\\n' +
          '/play - Start a quick match\\n' +
          '/join - Join an existing game\\n' +
          '/stats - View your statistics\\n' +
          '/help - Show this help message'
        );
      } catch (error) {
        this.logger.error('Error in start command:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
      }
    });

    // Play command - create a new quick match
    this.bot.command('play', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      try {
        const dbUser = await this.userService.findByTelegramId(user.id);
        const game = await this.gameEngineService.createQuickMatch(dbUser.id);
        
        ctx.session.activeGameId = game.id;
        
        await ctx.reply(
          `🎮 Quick match created! Game ID: \`${game.id}\`\\n\\n` +
          '🔍 Waiting for another player to join...\\n' +
          'Share this message with a friend or use /join in another chat!'
        );
      } catch (error) {
        this.logger.error('Error in play command:', error);
        await ctx.reply('❌ Could not create game. Please try again.');
      }
    });

    // Join command - join an existing game
    this.bot.command('join', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      try {
        const dbUser = await this.userService.findByTelegramId(user.id);
        
        // Get active games
        const activeGames = await this.gameEngineService.getActiveGames();
        const availableGame = activeGames.find(g => 
          g.status === GameStatus.WAITING_FOR_PLAYERS && 
          g.player1.id !== dbUser.id
        );

        if (!availableGame) {
          await ctx.reply('❌ No available games found. Use /play to create a new game!');
          return;
        }

        const game = await this.gameEngineService.joinGame(availableGame.id, dbUser.id);
        ctx.session.activeGameId = game.id;
        ctx.session.waitingForMove = true;

        await ctx.reply(
          `⚔️ Game joined! You're playing against ${game.player1.displayName}\\n\\n` +
          '🎯 Choose your move:\\n' +
          '/rock 🪨\\n' +
          '/paper 📄\\n' +
          '/scissors ✂️'
        );

        // Notify the other player if possible
        this.logger.log(`Game ${game.id} is ready to start`);
        
      } catch (error) {
        this.logger.error('Error in join command:', error);
        await ctx.reply('❌ Could not join game. Please try again.');
      }
    });

    // Move commands
    this.bot.command('rock', (ctx) => this.handleMove(ctx, GameMove.ROCK));
    this.bot.command('paper', (ctx) => this.handleMove(ctx, GameMove.PAPER));
    this.bot.command('scissors', (ctx) => this.handleMove(ctx, GameMove.SCISSORS));

    // Stats command
    this.bot.command('stats', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      try {
        const dbUser = await this.userService.findByTelegramId(user.id);
        const stats = await this.gameEngineService.getPlayerStats(dbUser.id);

        await ctx.reply(
          `📊 Your Statistics:\\n\\n` +
          `🎮 Total Games: ${stats.totalGames}\\n` +
          `🏆 Wins: ${stats.wins}\\n` +
          `💔 Losses: ${stats.losses}\\n` +
          `🤝 Draws: ${stats.draws}\\n` +
          `📈 Win Rate: ${stats.winRate}%\\n` +
          `🔥 Current Streak: ${stats.currentStreak}\\n` +
          `⭐ Best Streak: ${stats.bestStreak}\\n` +
          `❤️ Favorite Move: ${stats.favoriteMove || 'None yet'}\\n` +
          `📋 Recent Form: ${stats.recentForm.join(' ') || 'No games yet'}`
        );
      } catch (error) {
        this.logger.error('Error in stats command:', error);
        await ctx.reply('❌ Could not fetch statistics. Please try again.');
      }
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '🎮 RPS Tournament Bot Help\\n\\n' +
        '**Game Commands:**\\n' +
        '/play - Create a new quick match\\n' +
        '/join - Join an available game\\n' +
        '/rock - Choose rock 🪨\\n' +
        '/paper - Choose paper 📄\\n' +
        '/scissors - Choose scissors ✂️\\n\\n' +
        '**Info Commands:**\\n' +
        '/stats - View your game statistics\\n' +
        '/help - Show this help message\\n\\n' +
        '**How to Play:**\\n' +
        '1. Use /play to create a game\\n' +
        '2. Share the game ID with a friend\\n' +
        '3. Friend uses /join to join\\n' +
        '4. Both players choose moves\\n' +
        '5. Best of 3 rounds wins!'
      );
    });
  }

  private async handleMove(ctx: BotContext, move: GameMove) {
    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await this.userService.findByTelegramId(user.id);
      const gameId = ctx.session.activeGameId;

      if (!gameId) {
        await ctx.reply('❌ You are not in an active game. Use /play or /join first!');
        return;
      }

      const game = await this.gameEngineService.submitMove(gameId, dbUser.id, move);
      
      const moveEmoji = {
        [GameMove.ROCK]: '🪨',
        [GameMove.PAPER]: '📄',
        [GameMove.SCISSORS]: '✂️'
      };

      await ctx.reply(`✅ You chose ${moveEmoji[move]} ${move.toLowerCase()}!`);

      // Check if both players have moved
      if (game.player1Move && game.player2Move) {
        // Game round completed
        const result = this.formatGameResult(game, dbUser.id);
        await ctx.reply(result);

        if (game.isCompleted) {
          // Game finished
          ctx.session.activeGameId = undefined;
          ctx.session.waitingForMove = false;
          
          const finalResult = this.formatFinalResult(game, dbUser.id);
          await ctx.reply(finalResult);
        } else {
          // Next round
          await ctx.reply(
            '🔄 Next round! Choose your move:\\n' +
            '/rock 🪨  /paper 📄  /scissors ✂️'
          );
        }
      } else {
        // Waiting for other player
        await ctx.reply('⏳ Waiting for your opponent to make their move...');
      }

    } catch (error) {
      this.logger.error('Error in move command:', error);
      await ctx.reply('❌ Could not process move. Please try again.');
    }
  }

  private formatGameResult(game: any, playerId: string): string {
    const player1Move = game.player1Move;
    const player2Move = game.player2Move;
    const isPlayer1 = game.player1.id === playerId;
    
    const moveEmoji = {
      [GameMove.ROCK]: '🪨',
      [GameMove.PAPER]: '📄',
      [GameMove.SCISSORS]: '✂️'
    };

    const myMove = isPlayer1 ? player1Move : player2Move;
    const opponentMove = isPlayer1 ? player2Move : player1Move;
    const opponentName = isPlayer1 ? game.player2.displayName : game.player1.displayName;

    let result = `🎯 Round Result:\\n`;
    result += `You: ${moveEmoji[myMove]} ${myMove}\\n`;
    result += `${opponentName}: ${moveEmoji[opponentMove]} ${opponentMove}\\n\\n`;

    // Determine winner
    if (myMove === opponentMove) {
      result += '🤝 It\'s a draw!';
    } else if (
      (myMove === GameMove.ROCK && opponentMove === GameMove.SCISSORS) ||
      (myMove === GameMove.PAPER && opponentMove === GameMove.ROCK) ||
      (myMove === GameMove.SCISSORS && opponentMove === GameMove.PAPER)
    ) {
      result += '🎉 You won this round!';
    } else {
      result += '💔 You lost this round!';
    }

    return result;
  }

  private formatFinalResult(game: any, playerId: string): string {
    const isPlayer1 = game.player1.id === playerId;
    const isWinner = game.winner?.id === playerId;
    const opponentName = isPlayer1 ? game.player2.displayName : game.player1.displayName;

    if (!game.winner) {
      return '🤝 Game ended in a draw! Well played!';
    }

    if (isWinner) {
      return `🏆 Congratulations! You won the game against ${opponentName}!\\n\\nPlay again with /play`;
    } else {
      return `💔 You lost the game against ${opponentName}. Better luck next time!\\n\\nPlay again with /play`;
    }
  }
}