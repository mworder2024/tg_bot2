import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { IsEnum, IsUUID, IsOptional, IsNumber, Min, IsDate } from 'class-validator';
import { User } from './user.entity';
// import { Tournament } from './tournament.entity';
// import { TournamentMatch } from './tournament-match.entity';

/**
 * Game Move Enum - Valid moves in Rock-Paper-Scissors
 */
export enum GameMove {
  ROCK = 'ROCK',
  PAPER = 'PAPER',
  SCISSORS = 'SCISSORS',
}

/**
 * Game Result Enum - Possible game outcomes
 */
export enum GameResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  DRAW = 'DRAW',
}

/**
 * Game Status Enum - Current status of the game
 */
export enum GameStatus {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  WAITING_FOR_MOVES = 'WAITING_FOR_MOVES',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Game Type Enum - Different types of games
 */
export enum GameType {
  QUICK_MATCH = 'QUICK_MATCH',
  TOURNAMENT = 'TOURNAMENT',
  PRACTICE = 'PRACTICE',
  CHALLENGE = 'CHALLENGE',
}

/**
 * Game Entity - Individual Rock-Paper-Scissors game session
 * 
 * @description Represents a single game between two players with moves,
 * results, and metadata. Games can be standalone or part of tournaments.
 * 
 * Features:
 * - Complete game state tracking
 * - Move validation and result calculation
 * - Tournament integration
 * - Performance metrics
 * - Comprehensive indexing for analytics
 * 
 * @example
 * ```typescript
 * const game = new Game();
 * game.player1 = user1;
 * game.player2 = user2;
 * game.type = GameType.QUICK_MATCH;
 * game.player1Move = GameMove.ROCK;
 * game.player2Move = GameMove.SCISSORS;
 * game.result = GameResult.PLAYER1_WIN;
 * game.winner = user1;
 * await gameRepository.save(game);
 * ```
 */
@Entity('games')
@Index(['status'])
@Index(['type'])
@Index(['result'])
@Index(['playedAt'])
@Index(['player1', 'playedAt'])
@Index(['player2', 'playedAt'])
@Index(['winner'])
// @Index(['tournament'])
// @Index(['tournamentMatch'])
@Check(`"player1_id" != "player2_id"`)
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of game being played
   */
  @Column({ type: 'varchar', default: GameType.QUICK_MATCH })
  @IsEnum(GameType)
  type: GameType;

  /**
   * Current status of the game
   */
  @Column({ type: 'varchar', default: GameStatus.WAITING_FOR_PLAYERS })
  @IsEnum(GameStatus)
  status: GameStatus;

  // Players

  /**
   * First player in the game
   */
  @ManyToOne(() => User, user => user.gamesAsPlayer1, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'player1_id' })
  player1: User;

  /**
   * Second player in the game
   */
  @ManyToOne(() => User, user => user.gamesAsPlayer2, { 
    nullable: true, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'player2_id' })
  player2?: User;

  // Moves

  /**
   * Player 1's move (hidden until both players move)
   */
  @Column({ 
    name: 'player1_move', 
    type: 'varchar', 
    nullable: true 
  })
  @IsOptional()
  @IsEnum(GameMove)
  player1Move?: GameMove;

  /**
   * Player 2's move (hidden until both players move)
   */
  @Column({ 
    name: 'player2_move', 
    type: 'varchar', 
    nullable: true 
  })
  @IsOptional()
  @IsEnum(GameMove)
  player2Move?: GameMove;

  // Results

  /**
   * Game result after both players have moved
   */
  @Column({ 
    type: 'varchar', 
    nullable: true 
  })
  @IsOptional()
  @IsEnum(GameResult)
  result?: GameResult;

  /**
   * Winner of the game (null for draws)
   */
  @ManyToOne(() => User, user => user.gamesWon, { 
    nullable: true, 
    onDelete: 'SET NULL',
    eager: true 
  })
  @JoinColumn({ name: 'winner_id' })
  winner?: User;

  // Tournament Integration

  // Tournament relationships - Disabled for MVP (SQLite compatibility)
  // /**
  //  * Tournament this game belongs to (if any)
  //  */
  // @ManyToOne(() => Tournament, tournament => tournament.games, { 
  //   nullable: true, 
  //   onDelete: 'CASCADE' 
  // })
  // @JoinColumn({ name: 'tournament_id' })
  // tournament?: Tournament;

  // /**
  //  * Specific tournament match this game belongs to
  //  */
  // @ManyToOne(() => TournamentMatch, match => match.games, { 
  //   nullable: true, 
  //   onDelete: 'CASCADE' 
  // })
  // @JoinColumn({ name: 'tournament_match_id' })
  // tournamentMatch?: TournamentMatch;

  // /**
  //  * Round number in tournament (1 = first round, 2 = quarter-finals, etc.)
  //  */
  // @Column({ name: 'tournament_round', nullable: true })
  // @IsOptional()
  // @IsNumber()
  // @Min(1)
  // tournamentRound?: number;

  // Timing

  /**
   * When the game was created
   */
  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate()
  createdAt: Date;

  /**
   * When the game started (both players joined)
   */
  @Column({ name: 'started_at', nullable: true })
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  /**
   * When the game was completed
   */
  @Column({ name: 'played_at', nullable: true })
  @IsOptional()
  @IsDate()
  playedAt?: Date;

  /**
   * Game duration in seconds
   */
  @Column({ name: 'duration_seconds', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  /**
   * Timeout timestamp for move submission
   */
  @Column({ name: 'timeout_at', nullable: true })
  @IsOptional()
  @IsDate()
  timeoutAt?: Date;

  // Metadata

  /**
   * Additional game metadata (JSON)
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    moveHistory?: Array<{
      player: 'player1' | 'player2';
      move: GameMove;
      timestamp: Date;
    }>;
    spectators?: string[];
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    aiOpponent?: boolean;
    cancellationReason?: string;
  };

  /**
   * Timestamp when game was last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed Properties

  /**
   * Check if game is completed
   */
  get isCompleted(): boolean {
    return this.status === GameStatus.COMPLETED;
  }

  /**
   * Check if game is waiting for moves
   */
  get isWaitingForMoves(): boolean {
    return this.status === GameStatus.WAITING_FOR_MOVES;
  }

  /**
   * Check if both players have joined
   */
  get hasAllPlayers(): boolean {
    return this.player1 && this.player2 !== undefined;
  }

  /**
   * Check if both players have submitted moves
   */
  get hasAllMoves(): boolean {
    return this.player1Move !== undefined && this.player2Move !== undefined;
  }

  /**
   * Get the losing player (null for draws)
   */
  get loser(): User | null {
    if (!this.result || this.result === GameResult.DRAW) {
      return null;
    }
    
    return this.result === GameResult.PLAYER1_WIN ? this.player2 : this.player1;
  }

  /**
   * Check if game is a tournament game - Disabled for MVP
   */
  get isTournamentGame(): boolean {
    return false; // Always false for MVP since tournaments are disabled
  }

  /**
   * Get game duration in a readable format
   */
  get formattedDuration(): string {
    if (!this.durationSeconds) return 'Unknown';
    
    const minutes = Math.floor(this.durationSeconds / 60);
    const seconds = this.durationSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Check if game has timed out
   */
  get isTimedOut(): boolean {
    return this.timeoutAt ? new Date() > this.timeoutAt : false;
  }

  // Methods

  /**
   * Add player 2 to the game
   */
  addPlayer2(player: User): void {
    if (this.player2) {
      throw new Error('Game already has two players');
    }
    
    if (this.player1.id === player.id) {
      throw new Error('Player cannot play against themselves');
    }
    
    this.player2 = player;
    this.status = GameStatus.WAITING_FOR_MOVES;
    this.startedAt = new Date();
    
    // Set timeout (5 minutes for moves)
    this.timeoutAt = new Date(Date.now() + 5 * 60 * 1000);
  }

  /**
   * Submit a move for a player
   */
  submitMove(playerId: string, move: GameMove): void {
    if (this.status !== GameStatus.WAITING_FOR_MOVES) {
      throw new Error('Game is not waiting for moves');
    }
    
    if (this.isTimedOut) {
      this.status = GameStatus.TIMEOUT;
      throw new Error('Game has timed out');
    }
    
    if (this.player1.id === playerId) {
      if (this.player1Move) {
        throw new Error('Player 1 has already submitted a move');
      }
      this.player1Move = move;
    } else if (this.player2?.id === playerId) {
      if (this.player2Move) {
        throw new Error('Player 2 has already submitted a move');
      }
      this.player2Move = move;
    } else {
      throw new Error('Player is not part of this game');
    }
    
    // Add to move history
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.moveHistory) {
      this.metadata.moveHistory = [];
    }
    
    this.metadata.moveHistory.push({
      player: this.player1.id === playerId ? 'player1' : 'player2',
      move,
      timestamp: new Date(),
    });
    
    // Check if both moves are submitted
    if (this.hasAllMoves) {
      this.calculateResult();
    }
  }

  /**
   * Calculate game result when both moves are submitted
   */
  private calculateResult(): void {
    if (!this.hasAllMoves) {
      throw new Error('Cannot calculate result without both moves');
    }
    
    this.result = Game.determineWinner(this.player1Move!, this.player2Move!);
    
    // Set winner
    switch (this.result) {
      case GameResult.PLAYER1_WIN:
        this.winner = this.player1;
        break;
      case GameResult.PLAYER2_WIN:
        this.winner = this.player2!;
        break;
      case GameResult.DRAW:
        this.winner = undefined;
        break;
    }
    
    this.status = GameStatus.COMPLETED;
    this.playedAt = new Date();
    
    // Calculate duration
    if (this.startedAt) {
      this.durationSeconds = Math.floor(
        (this.playedAt.getTime() - this.startedAt.getTime()) / 1000
      );
    }
  }

  /**
   * Cancel the game
   */
  cancel(reason?: string): void {
    this.status = GameStatus.CANCELLED;
    
    if (!this.metadata) {
      this.metadata = {};
    }
    
    if (reason) {
      this.metadata.cancellationReason = reason;
    }
  }

  /**
   * Handle game timeout
   */
  handleTimeout(): void {
    if (this.status !== GameStatus.WAITING_FOR_MOVES) {
      return;
    }
    
    this.status = GameStatus.TIMEOUT;
    
    // Determine winner based on who submitted moves
    if (this.player1Move && !this.player2Move) {
      this.winner = this.player1;
      this.result = GameResult.PLAYER1_WIN;
    } else if (this.player2Move && !this.player1Move) {
      this.winner = this.player2;
      this.result = GameResult.PLAYER2_WIN;
    }
    // If neither or both submitted moves, no winner
    
    this.playedAt = new Date();
  }

  /**
   * Get player's move (only for the player themselves or after game completion)
   */
  getPlayerMove(playerId: string): GameMove | null {
    if (!this.isCompleted && !this.isTimedOut) {
      // During active game, only show own move
      if (this.player1.id === playerId) {
        return this.player1Move || null;
      } else if (this.player2?.id === playerId) {
        return this.player2Move || null;
      }
      return null;
    }
    
    // After game completion, show all moves
    if (this.player1.id === playerId) {
      return this.player1Move || null;
    } else if (this.player2?.id === playerId) {
      return this.player2Move || null;
    }
    
    return null;
  }

  /**
   * Get game state for a specific player
   */
  getGameStateForPlayer(playerId: string): {
    id: string;
    type: GameType;
    status: GameStatus;
    opponent?: { id: string; username?: string; displayName: string };
    myMove?: GameMove;
    opponentMove?: GameMove;
    result?: GameResult;
    winner?: { id: string; username?: string; displayName: string };
    timeoutAt?: Date;
    canSubmitMove: boolean;
  } {
    const isPlayer1 = this.player1.id === playerId;
    const isPlayer2 = this.player2?.id === playerId;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Player is not part of this game');
    }
    
    const opponent = isPlayer1 ? this.player2 : this.player1;
    const myMove = this.getPlayerMove(playerId);
    const opponentMove = this.isCompleted || this.isTimedOut 
      ? (isPlayer1 ? this.player2Move : this.player1Move)
      : undefined;
    
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      opponent: opponent ? {
        id: opponent.id,
        username: opponent.username,
        displayName: opponent.displayName,
      } : undefined,
      myMove,
      opponentMove,
      result: this.result,
      winner: this.winner ? {
        id: this.winner.id,
        username: this.winner.username,
        displayName: this.winner.displayName,
      } : undefined,
      timeoutAt: this.timeoutAt,
      canSubmitMove: this.status === GameStatus.WAITING_FOR_MOVES && 
                     !this.isTimedOut && 
                     !myMove,
    };
  }

  // Static Methods

  /**
   * Determine winner based on moves using Rock-Paper-Scissors rules
   */
  static determineWinner(move1: GameMove, move2: GameMove): GameResult {
    if (move1 === move2) {
      return GameResult.DRAW;
    }
    
    const winConditions = {
      [GameMove.ROCK]: GameMove.SCISSORS,     // Rock beats Scissors
      [GameMove.PAPER]: GameMove.ROCK,        // Paper beats Rock
      [GameMove.SCISSORS]: GameMove.PAPER,    // Scissors beats Paper
    };
    
    return winConditions[move1] === move2 
      ? GameResult.PLAYER1_WIN 
      : GameResult.PLAYER2_WIN;
  }

  /**
   * Validate a game move
   */
  static validateMove(move: any): boolean {
    return Object.values(GameMove).includes(move);
  }

  /**
   * Get move that beats the given move
   */
  static getWinningMove(move: GameMove): GameMove {
    const winningMoves = {
      [GameMove.ROCK]: GameMove.PAPER,
      [GameMove.PAPER]: GameMove.SCISSORS,
      [GameMove.SCISSORS]: GameMove.ROCK,
    };
    
    return winningMoves[move];
  }

  /**
   * Get move that loses to the given move
   */
  static getLosingMove(move: GameMove): GameMove {
    const losingMoves = {
      [GameMove.ROCK]: GameMove.SCISSORS,
      [GameMove.PAPER]: GameMove.ROCK,
      [GameMove.SCISSORS]: GameMove.PAPER,
    };
    
    return losingMoves[move];
  }

  /**
   * Create a practice game against AI
   */
  static createPracticeGame(player: User, difficulty: 'easy' | 'medium' | 'hard'): Game {
    const game = new Game();
    game.type = GameType.PRACTICE;
    game.player1 = player;
    game.status = GameStatus.WAITING_FOR_MOVES;
    game.startedAt = new Date();
    game.timeoutAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    game.metadata = {
      aiOpponent: true,
      difficulty,
    };
    
    return game;
  }
}