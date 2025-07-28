import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserService } from "../user/user.service";
import { GameEngineService } from "../../services/game-engine.service";
import { GameMove, GameStatus } from "../../entities/game.entity";

/**
 * Mock Bot Service for testing when Telegram API is not accessible
 * This service simulates bot commands through console input
 */
@Injectable()
export class MockBotService implements OnModuleInit {
  private readonly logger = new Logger(MockBotService.name);
  private activeGames: Map<number, string> = new Map(); // Track active game per user

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly gameEngineService: GameEngineService,
  ) {}

  async onModuleInit() {
    this.logger.warn("🤖 MOCK BOT MODE - Telegram API not accessible");
    this.logger.log(
      "Bot commands can be tested through the console or API endpoints",
    );
    this.logger.log("Available commands:");
    this.logger.log("  /start - Initialize user");
    this.logger.log("  /play - Create a quick match");
    this.logger.log("  /join - Join an existing game");
    this.logger.log("  /rock, /paper, /scissors - Make moves");
    this.logger.log("  /stats - View statistics");
    this.logger.log("  /help - Show help");
  }

  /**
   * Simulate command processing
   * This can be called from a REST endpoint or CLI
   */
  async processCommand(
    telegramId: number,
    username: string,
    command: string,
    args?: string[],
  ): Promise<string> {
    try {
      switch (command) {
        case "/start":
          return await this.handleStart(telegramId, username);

        case "/play":
          return await this.handlePlay(telegramId);

        case "/join":
          return await this.handleJoin(telegramId, args?.[0]);

        case "/rock":
          return await this.handleMove(telegramId, GameMove.ROCK);

        case "/paper":
          return await this.handleMove(telegramId, GameMove.PAPER);

        case "/scissors":
          return await this.handleMove(telegramId, GameMove.SCISSORS);

        case "/stats":
          return await this.handleStats(telegramId);

        case "/help":
          return this.handleHelp();

        default:
          return "❌ Unknown command. Use /help to see available commands.";
      }
    } catch (error) {
      this.logger.error(`Error processing command ${command}:`, error);
      return "❌ Something went wrong. Please try again.";
    }
  }

  private async handleStart(
    telegramId: number,
    username: string,
  ): Promise<string> {
    await this.userService.createUser({
      telegramId,
      username,
      firstName: username,
      lastName: "",
    });

    return `🎮 Welcome to RPS Tournament Bot!

Commands:
/play - Start a quick match
/join - Join an existing game
/stats - View your statistics
/help - Show this help message`;
  }

  private async handlePlay(telegramId: number): Promise<string> {
    try {
      let user = await this.userService.findByTelegramId(telegramId);
      if (!user) {
        // Create user if not exists
        user = await this.userService.createUser({
          telegramId,
          username: `user_${telegramId}`,
          firstName: `User ${telegramId}`,
          lastName: "",
        });
      }
      const game = await this.gameEngineService.createQuickMatch(user.id);

      this.activeGames.set(telegramId, game.id);

      return `🎮 Quick match created! Game ID: ${game.id}

🔍 Waiting for another player to join...
Share this game ID with a friend or use /join ${game.id} in another session!`;
    } catch (error) {
      this.logger.error("Error in handlePlay:", error);
      throw error;
    }
  }

  private async handleJoin(
    telegramId: number,
    gameId?: string,
  ): Promise<string> {
    let user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      // Create user if not exists
      user = await this.userService.createUser({
        telegramId,
        username: `user_${telegramId}`,
        firstName: `User ${telegramId}`,
        lastName: "",
      });
    }

    if (gameId) {
      // Join specific game
      try {
        const game = await this.gameEngineService.joinGame(gameId, user.id);
        this.activeGames.set(telegramId, game.id);
        return `⚔️ Game joined! You're playing against ${game.player1.displayName}

🎯 Choose your move:
/rock 🪨
/paper 📄
/scissors ✂️`;
      } catch (error) {
        return `❌ Could not join game ${gameId}. It may be full or not exist.`;
      }
    }

    // Find available game
    const activeGames = await this.gameEngineService.getActiveGames();
    const availableGame = activeGames.find(
      (g) =>
        g.status === GameStatus.WAITING_FOR_PLAYERS && g.player1.id !== user.id,
    );

    if (!availableGame) {
      return "❌ No available games found. Use /play to create a new game!";
    }

    const game = await this.gameEngineService.joinGame(
      availableGame.id,
      user.id,
    );
    this.activeGames.set(telegramId, game.id);

    return `⚔️ Game joined! You're playing against ${game.player1.displayName}

🎯 Choose your move:
/rock 🪨
/paper 📄
/scissors ✂️`;
  }

  private async handleMove(
    telegramId: number,
    move: GameMove,
  ): Promise<string> {
    let user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      return "❌ Please use /start first to register!";
    }

    const activeGameId = this.activeGames.get(telegramId);
    if (!activeGameId) {
      return "❌ You are not in an active game. Use /play or /join first!";
    }

    const game = await this.gameEngineService.submitMove(
      activeGameId,
      user.id,
      move,
    );

    const moveEmoji = {
      [GameMove.ROCK]: "🪨",
      [GameMove.PAPER]: "📄",
      [GameMove.SCISSORS]: "✂️",
    };

    let response = `✅ You chose ${moveEmoji[move]} ${move.toLowerCase()}!\\n`;

    // Check if both players have moved
    if (game.player1Move && game.player2Move) {
      // Game round completed
      response += this.formatGameResult(game, user.id);

      if (game.isCompleted) {
        // Game finished
        this.activeGames.delete(telegramId);
        response += "\\n" + this.formatFinalResult(game, user.id);
      } else {
        // Next round
        response +=
          "\\n🔄 Next round! Choose your move:\\n/rock 🪨  /paper 📄  /scissors ✂️";
      }
    } else {
      // Waiting for other player
      response += "\\n⏳ Waiting for your opponent to make their move...";
    }

    return response;
  }

  private async handleStats(telegramId: number): Promise<string> {
    let user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      return "❌ Please use /start first to register!";
    }
    const stats = await this.gameEngineService.getPlayerStats(user.id);

    return `📊 Your Statistics:

🎮 Total Games: ${stats.totalGames}
🏆 Wins: ${stats.wins}
💔 Losses: ${stats.losses}
🤝 Draws: ${stats.draws}
📈 Win Rate: ${stats.winRate}%
🔥 Current Streak: ${stats.currentStreak}
⭐ Best Streak: ${stats.bestStreak}
❤️ Favorite Move: ${stats.favoriteMove || "None yet"}
📋 Recent Form: ${stats.recentForm.join(" ") || "No games yet"}`;
  }

  private handleHelp(): string {
    return `🎮 RPS Tournament Bot Help

**Game Commands:**
/play - Create a new quick match
/join - Join an available game
/join [gameId] - Join a specific game
/rock - Choose rock 🪨
/paper - Choose paper 📄
/scissors - Choose scissors ✂️

**Info Commands:**
/stats - View your game statistics
/help - Show this help message

**How to Play:**
1. Use /play to create a game
2. Share the game ID with a friend
3. Friend uses /join [gameId] to join
4. Both players choose moves
5. Best of 3 rounds wins!`;
  }

  private formatGameResult(game: any, playerId: string): string {
    const isPlayer1 = game.player1.id === playerId;
    const myMove = isPlayer1 ? game.player1Move : game.player2Move;
    const opponentMove = isPlayer1 ? game.player2Move : game.player1Move;
    const opponentName = isPlayer1
      ? game.player2.displayName
      : game.player1.displayName;

    const moveEmoji = {
      [GameMove.ROCK]: "🪨",
      [GameMove.PAPER]: "📄",
      [GameMove.SCISSORS]: "✂️",
    };

    let result = `\\n🎯 Round Result:\\n`;
    result += `You: ${moveEmoji[myMove]} ${myMove}\\n`;
    result += `${opponentName}: ${moveEmoji[opponentMove]} ${opponentMove}\\n\\n`;

    // Determine winner
    if (myMove === opponentMove) {
      result += "🤝 It's a draw!";
    } else if (
      (myMove === GameMove.ROCK && opponentMove === GameMove.SCISSORS) ||
      (myMove === GameMove.PAPER && opponentMove === GameMove.ROCK) ||
      (myMove === GameMove.SCISSORS && opponentMove === GameMove.PAPER)
    ) {
      result += "🎉 You won this round!";
    } else {
      result += "💔 You lost this round!";
    }

    return result;
  }

  private formatFinalResult(game: any, playerId: string): string {
    const isWinner = game.winner?.id === playerId;
    const isPlayer1 = game.player1.id === playerId;
    const opponentName = isPlayer1
      ? game.player2.displayName
      : game.player1.displayName;

    if (!game.winner) {
      return "\\n🤝 Game ended in a draw! Well played!\\n\\nPlay again with /play";
    }

    if (isWinner) {
      return `\\n🏆 Congratulations! You won the game against ${opponentName}!\\n\\nPlay again with /play`;
    } else {
      return `\\n💔 You lost the game against ${opponentName}. Better luck next time!\\n\\nPlay again with /play`;
    }
  }
}
