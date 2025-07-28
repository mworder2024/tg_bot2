import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Game,
  GameMove,
  GameResult,
  GameStatus,
  GameType,
} from "../entities/game.entity";
import { User } from "../entities/user.entity";
import { UserStats } from "../entities/user-stats.entity";

/**
 * GameEngineService - Core game logic and state management
 *
 * @description Handles all game operations including creation, joining,
 * move submission, and game completion. Implements Rock-Paper-Scissors
 * game rules and manages game state transitions.
 *
 * Features:
 * - Quick match creation and matchmaking
 * - Turn-based move submission with validation
 * - Automatic game completion and result calculation
 * - User statistics tracking and updates
 * - Game timeout handling
 * - Comprehensive error handling and validation
 *
 * @example
 * ```typescript
 * const game = await gameEngine.createQuickMatch(playerId);
 * await gameEngine.joinGame(game.id, opponentId);
 * await gameEngine.submitMove(game.id, playerId, GameMove.ROCK);
 * ```
 */
@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>,
  ) {}

  /**
   * Create a new quick match game
   *
   * @param playerId - ID of the player creating the game
   * @returns Promise<Game> - The created game
   * @throws NotFoundException - When player is not found
   */
  async createQuickMatch(playerId: string): Promise<Game> {
    try {
      // Validate player exists
      const player = await this.userRepository.findOneBy({ id: playerId });
      if (!player) {
        throw new NotFoundException("Player not found");
      }

      // Create new game
      const game = this.gameRepository.create({
        type: GameType.QUICK_MATCH,
        status: GameStatus.WAITING_FOR_PLAYERS,
        player1: player,
        createdAt: new Date(),
      });

      const savedGame = await this.gameRepository.save(game);

      this.logger.log(
        `Quick match created: ${savedGame.id} by player ${playerId}`,
      );
      return savedGame;
    } catch (error) {
      this.logger.error(
        `Failed to create quick match for player ${playerId}`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error("Failed to create quick match");
    }
  }

  /**
   * Join an existing game
   *
   * @param gameId - ID of the game to join
   * @param playerId - ID of the player joining
   * @returns Promise<Game> - The updated game
   * @throws NotFoundException - When game or player is not found
   * @throws BadRequestException - When game cannot be joined
   */
  async joinGame(gameId: string, playerId: string): Promise<Game> {
    try {
      // Find the game
      const game = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: ["player1", "player2"],
      });

      if (!game) {
        throw new NotFoundException("Game not found");
      }

      // Validate player exists
      const player = await this.userRepository.findOneBy({ id: playerId });
      if (!player) {
        throw new NotFoundException("Player not found");
      }

      // Validate game can be joined
      if (game.player2) {
        throw new BadRequestException("Game is already full");
      }

      if (game.player1.id === playerId) {
        throw new BadRequestException("Cannot play against yourself");
      }

      if (game.status !== GameStatus.WAITING_FOR_PLAYERS) {
        throw new BadRequestException("Game is not accepting players");
      }

      // Add player to game
      game.addPlayer2(player);

      const updatedGame = await this.gameRepository.save(game);

      this.logger.log(`Player ${playerId} joined game ${gameId}`);
      return updatedGame;
    } catch (error) {
      this.logger.error(
        `Failed to join game ${gameId} for player ${playerId}`,
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new Error("Failed to join game");
    }
  }

  /**
   * Submit a move for a player in a game
   *
   * @param gameId - ID of the game
   * @param playerId - ID of the player making the move
   * @param move - The move being made
   * @returns Promise<Game> - The updated game
   */
  async submitMove(
    gameId: string,
    playerId: string,
    move: GameMove,
  ): Promise<Game> {
    try {
      // Validate move
      if (!Game.validateMove(move)) {
        throw new BadRequestException("Invalid move");
      }

      // Find the game
      const game = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: ["player1", "player2", "winner"],
      });

      if (!game) {
        throw new NotFoundException("Game not found");
      }

      // Validate player is part of the game
      if (game.player1.id !== playerId && game.player2?.id !== playerId) {
        throw new BadRequestException("Player is not part of this game");
      }

      // Validate game state
      if (game.status !== GameStatus.WAITING_FOR_MOVES) {
        throw new BadRequestException("Game is not waiting for moves");
      }

      if (game.isTimedOut) {
        throw new BadRequestException("Game has timed out");
      }

      // Check if player already submitted move
      if (game.player1.id === playerId && game.player1Move) {
        throw new BadRequestException("Move already submitted");
      }
      if (game.player2?.id === playerId && game.player2Move) {
        throw new BadRequestException("Move already submitted");
      }

      // Submit the move
      game.submitMove(playerId, move);

      const updatedGame = await this.gameRepository.save(game);

      // If game is completed, update user stats
      if (updatedGame.isCompleted) {
        await this.updateUserStats(updatedGame);
        this.logger.log(
          `Game completed: ${gameId}, winner: ${updatedGame.winner?.id || "draw"}`,
        );
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(
        `Failed to submit move for game ${gameId}, player ${playerId}`,
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new Error("Failed to submit move");
    }
  }

  /**
   * Get a game by ID
   *
   * @param gameId - ID of the game
   * @returns Promise<Game> - The game
   * @throws NotFoundException - When game is not found
   */
  async getGameById(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ["player1", "player2", "winner"], // tournament removed for MVP
    });

    if (!game) {
      throw new NotFoundException("Game not found");
    }

    return game;
  }

  /**
   * Get games for a specific player
   *
   * @param playerId - ID of the player
   * @param limit - Maximum number of games to return (default: 50)
   * @param offset - Number of games to skip (default: 0)
   * @returns Promise<Game[]> - Array of games
   */
  async getPlayerGames(
    playerId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Game[]> {
    return (
      this.gameRepository
        .createQueryBuilder("game")
        .leftJoinAndSelect("game.player1", "player1")
        .leftJoinAndSelect("game.player2", "player2")
        .leftJoinAndSelect("game.winner", "winner")
        // .leftJoinAndSelect('game.tournament', 'tournament') // Disabled for MVP
        .where("game.player1 = :playerId", { playerId })
        .orWhere("game.player2 = :playerId", { playerId })
        .orderBy("game.createdAt", "DESC")
        .limit(limit)
        .offset(offset)
        .getMany()
    );
  }

  /**
   * Get player statistics
   *
   * @param playerId - ID of the player
   * @returns Promise<PlayerStats> - Player statistics
   */
  async getPlayerStats(playerId: string): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    favoriteMove: string | null;
    recentForm: string[];
  }> {
    const games = await this.gameRepository
      .createQueryBuilder("game")
      .where("game.player1 = :playerId", { playerId })
      .orWhere("game.player2 = :playerId", { playerId })
      .getMany();

    if (games.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        favoriteMove: null,
        recentForm: [],
      };
    }

    // Calculate statistics
    const stats = {
      totalGames: games.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      favoriteMove: null as string | null,
      recentForm: [] as string[],
    };

    const moveCount = { ROCK: 0, PAPER: 0, SCISSORS: 0 };
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastResult: "win" | "loss" | "draw" | null = null;

    // Process games in chronological order for streak calculation
    const sortedGames = games.sort(
      (a, b) =>
        new Date(a.playedAt || a.createdAt).getTime() -
        new Date(b.playedAt || b.createdAt).getTime(),
    );

    for (const game of sortedGames) {
      if (!game.result) continue;

      let result: "win" | "loss" | "draw";
      let playerMove: GameMove | undefined;

      // Determine result and move for this player
      if (game.player1?.id === playerId) {
        playerMove = game.player1Move;
        if (game.result === GameResult.PLAYER1_WIN) {
          result = "win";
        } else if (game.result === GameResult.PLAYER2_WIN) {
          result = "loss";
        } else {
          result = "draw";
        }
      } else {
        playerMove = game.player2Move;
        if (game.result === GameResult.PLAYER2_WIN) {
          result = "win";
        } else if (game.result === GameResult.PLAYER1_WIN) {
          result = "loss";
        } else {
          result = "draw";
        }
      }

      // Update counters
      if (result === "win") {
        stats.wins++;
      } else if (result === "loss") {
        stats.losses++;
      } else {
        stats.draws++;
      }

      // Track moves
      if (playerMove) {
        moveCount[playerMove]++;
      }

      // Calculate streaks
      if (result === "win") {
        if (lastResult === "win") {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }

      lastResult = result;
    }

    // Current streak is the last streak if it's still active
    stats.currentStreak = lastResult === "win" ? tempStreak : 0;
    stats.bestStreak = bestStreak;

    // Calculate win rate
    stats.winRate =
      stats.totalGames > 0
        ? Math.round((stats.wins / stats.totalGames) * 10000) / 100
        : 0;

    // Find favorite move
    const maxMoveCount = Math.max(
      moveCount.ROCK,
      moveCount.PAPER,
      moveCount.SCISSORS,
    );
    if (maxMoveCount > 0) {
      stats.favoriteMove =
        Object.keys(moveCount).find(
          (move) => moveCount[move as keyof typeof moveCount] === maxMoveCount,
        ) || null;
    }

    // Recent form (last 10 games)
    const recentGames = sortedGames.slice(-10);
    stats.recentForm = recentGames.map((game) => {
      if (!game.result) return "P"; // Pending

      if (game.player1?.id === playerId) {
        return game.result === GameResult.PLAYER1_WIN
          ? "W"
          : game.result === GameResult.PLAYER2_WIN
            ? "L"
            : "D";
      } else {
        return game.result === GameResult.PLAYER2_WIN
          ? "W"
          : game.result === GameResult.PLAYER1_WIN
            ? "L"
            : "D";
      }
    });

    return stats;
  }

  /**
   * Cancel a game
   *
   * @param gameId - ID of the game to cancel
   * @param reason - Optional reason for cancellation
   * @returns Promise<Game> - The cancelled game
   */
  async cancelGame(gameId: string, reason?: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ["player1", "player2"],
    });

    if (!game) {
      throw new NotFoundException("Game not found");
    }

    if (game.status === GameStatus.COMPLETED) {
      throw new BadRequestException("Cannot cancel completed game");
    }

    game.cancel(reason);

    const updatedGame = await this.gameRepository.save(game);

    this.logger.log(
      `Game cancelled: ${gameId}${reason ? `, reason: ${reason}` : ""}`,
    );
    return updatedGame;
  }

  /**
   * Get all active games
   *
   * @returns Promise<Game[]> - Array of active games
   */
  async getActiveGames(): Promise<Game[]> {
    return this.gameRepository.find({
      where: [
        { status: GameStatus.WAITING_FOR_PLAYERS },
        { status: GameStatus.WAITING_FOR_MOVES },
      ],
      relations: ["player1", "player2"],
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Handle game timeout
   *
   * @param gameId - ID of the game that timed out
   * @returns Promise<Game> - The updated game
   */
  async handleGameTimeout(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ["player1", "player2", "winner"],
    });

    if (!game) {
      throw new NotFoundException("Game not found");
    }

    game.handleTimeout();

    const updatedGame = await this.gameRepository.save(game);

    // Update user stats if there's a winner due to timeout
    if (updatedGame.winner) {
      await this.updateUserStats(updatedGame);
    }

    this.logger.log(`Game timeout handled: ${gameId}`);
    return updatedGame;
  }

  /**
   * Update user statistics after game completion
   *
   * @private
   * @param game - The completed game
   */
  private async updateUserStats(game: Game): Promise<void> {
    if (!game.player1 || !game.player2 || !game.result) {
      return;
    }

    try {
      // Get or create user stats for both players
      const [player1Stats, player2Stats] = await Promise.all([
        this.getOrCreateUserStats(game.player1),
        this.getOrCreateUserStats(game.player2),
      ]);

      // Determine results for each player
      const player1Result =
        game.result === GameResult.PLAYER1_WIN
          ? "win"
          : game.result === GameResult.PLAYER2_WIN
            ? "loss"
            : "draw";

      const player2Result =
        game.result === GameResult.PLAYER2_WIN
          ? "win"
          : game.result === GameResult.PLAYER1_WIN
            ? "loss"
            : "draw";

      // Calculate game duration
      const gameDuration = game.durationSeconds || 0;

      // Update stats
      if (game.player1Move) {
        player1Stats.recordGameResult(
          player1Result,
          game.player1Move,
          gameDuration,
        );
      }

      if (game.player2Move) {
        player2Stats.recordGameResult(
          player2Result,
          game.player2Move,
          gameDuration,
        );
      }

      // Save updated stats
      await Promise.all([
        this.userStatsRepository.save(player1Stats),
        this.userStatsRepository.save(player2Stats),
      ]);

      this.logger.log(`User stats updated for game ${game.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to update user stats for game ${game.id}`,
        error,
      );
      // Don't throw error - stats update should not fail the main operation
    }
  }

  /**
   * Get or create user statistics
   *
   * @private
   * @param user - The user
   * @returns Promise<UserStats> - User statistics
   */
  private async getOrCreateUserStats(user: User): Promise<UserStats> {
    let stats = await this.userStatsRepository.findOne({
      where: { user: { id: user.id } },
      relations: ["user"],
    });

    if (!stats) {
      stats = this.userStatsRepository.create({
        user,
      });
      stats = await this.userStatsRepository.save(stats);
    }

    return stats;
  }

  /**
   * Get games that have timed out and need processing
   *
   * @returns Promise<Game[]> - Array of timed out games
   */
  async getTimedOutGames(): Promise<Game[]> {
    return this.gameRepository
      .createQueryBuilder("game")
      .where("game.status = :status", { status: GameStatus.WAITING_FOR_MOVES })
      .andWhere("game.timeoutAt < :now", { now: new Date() })
      .leftJoinAndSelect("game.player1", "player1")
      .leftJoinAndSelect("game.player2", "player2")
      .getMany();
  }

  /**
   * Process all timed out games
   *
   * @returns Promise<number> - Number of games processed
   */
  async processTimedOutGames(): Promise<number> {
    const timedOutGames = await this.getTimedOutGames();

    let processedCount = 0;

    for (const game of timedOutGames) {
      try {
        await this.handleGameTimeout(game.id);
        processedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to process timeout for game ${game.id}`,
          error,
        );
      }
    }

    if (processedCount > 0) {
      this.logger.log(`Processed ${processedCount} timed out games`);
    }

    return processedCount;
  }
}
