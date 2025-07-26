import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsDate, 
  Min, 
  Max 
} from 'class-validator';
import { User } from './user.entity';
import { Tournament } from './tournament.entity';
import { Game } from './game.entity';

/**
 * Match Status Enum - Current status of the tournament match
 */
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',         // Match is scheduled but not started
  ACTIVE = 'ACTIVE',               // Match is currently being played
  COMPLETED = 'COMPLETED',         // Match finished normally
  WALKOVER = 'WALKOVER',           // One player didn't show up
  DISQUALIFIED = 'DISQUALIFIED',   // Player was disqualified
  CANCELLED = 'CANCELLED',         // Match was cancelled
  POSTPONED = 'POSTPONED',         // Match was postponed
}

/**
 * TournamentMatch Entity - Individual matches within tournaments
 * 
 * @description Represents a match between two players in a tournament,
 * which may consist of multiple games. Handles best-of-X formats,
 * scheduling, and comprehensive match statistics.
 * 
 * Features:
 * - Best-of-X match format support
 * - Comprehensive scheduling and timing
 * - Detailed match statistics and analytics
 * - Bracket positioning and progression tracking
 * - Multiple game support within matches
 * - Advanced match management (postpone, cancel, etc.)
 * 
 * @example
 * ```typescript
 * const match = new TournamentMatch();
 * match.tournament = tournament;
 * match.player1 = user1;
 * match.player2 = user2;
 * match.round = 1;
 * match.matchNumber = 1;
 * match.bestOf = 3;
 * await matchRepository.save(match);
 * ```
 */
@Entity('tournament_matches')
@Index(['tournament', 'round'])
@Index(['tournament', 'status'])
@Index(['player1'])
@Index(['player2'])
@Index(['winner'])
@Index(['scheduledTime'])
@Index(['round', 'matchNumber'])
@Check(`"player1_id" != "player2_id"`)
@Check(`"best_of" % 2 = 1`) // Best of must be odd number
export class TournamentMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tournament Context

  /**
   * The tournament this match belongs to
   */
  @ManyToOne(() => Tournament, tournament => tournament.matches, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: false 
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  /**
   * Round number in tournament (1 = first round, 2 = quarterfinals, etc.)
   */
  @Column()
  @IsNumber()
  @Min(1)
  round: number;

  /**
   * Match number within the round
   */
  @Column({ name: 'match_number' })
  @IsNumber()
  @Min(1)
  matchNumber: number;

  /**
   * Bracket position identifier (for complex tournament formats)
   */
  @Column({ name: 'bracket_position', nullable: true })
  @IsOptional()
  bracketPosition?: string;

  // Players

  /**
   * First player in the match
   */
  @ManyToOne(() => User, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'player1_id' })
  player1: User;

  /**
   * Second player in the match
   */
  @ManyToOne(() => User, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'player2_id' })
  player2: User;

  /**
   * Match winner (determined after completion)
   */
  @ManyToOne(() => User, { 
    nullable: true, 
    onDelete: 'SET NULL',
    eager: true 
  })
  @JoinColumn({ name: 'winner_id' })
  winner?: User;

  /**
   * Match loser (computed property, but stored for convenience)
   */
  @ManyToOne(() => User, { 
    nullable: true, 
    onDelete: 'SET NULL',
    eager: true 
  })
  @JoinColumn({ name: 'loser_id' })
  loser?: User;

  // Match Format

  /**
   * Best-of-X format (must be odd: 1, 3, 5, 7, etc.)
   */
  @Column({ name: 'best_of', default: 1 })
  @IsNumber()
  @Min(1)
  @Max(11)
  bestOf: number;

  /**
   * Current status of the match
   */
  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.SCHEDULED })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  // Scoring

  /**
   * Player 1's score (games won in this match)
   */
  @Column({ name: 'player1_score', default: 0 })
  @IsNumber()
  @Min(0)
  player1Score: number;

  /**
   * Player 2's score (games won in this match)
   */
  @Column({ name: 'player2_score', default: 0 })
  @IsNumber()
  @Min(0)
  player2Score: number;

  // Timing

  /**
   * Scheduled start time for the match
   */
  @Column({ name: 'scheduled_time', nullable: true })
  @IsOptional()
  @IsDate()
  scheduledTime?: Date;

  /**
   * When the match actually started
   */
  @Column({ name: 'started_at', nullable: true })
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  /**
   * When the match was completed
   */
  @Column({ name: 'completed_at', nullable: true })
  @IsOptional()
  @IsDate()
  completedAt?: Date;

  /**
   * Match duration in seconds
   */
  @Column({ name: 'duration_seconds', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  /**
   * Deadline for match completion
   */
  @Column({ name: 'deadline', nullable: true })
  @IsOptional()
  @IsDate()
  deadline?: Date;

  // Next Match Progression

  /**
   * Next match for the winner (in elimination tournaments)
   */
  @ManyToOne(() => TournamentMatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winner_next_match_id' })
  winnerNextMatch?: TournamentMatch;

  /**
   * Next match for the loser (in double elimination)
   */
  @ManyToOne(() => TournamentMatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'loser_next_match_id' })
  loserNextMatch?: TournamentMatch;

  /**
   * Position in next match for winner (1 or 2)
   */
  @Column({ name: 'winner_next_position', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  winnerNextPosition?: number;

  /**
   * Position in next match for loser (1 or 2)
   */
  @Column({ name: 'loser_next_position', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  loserNextPosition?: number;

  // Statistics

  /**
   * Total number of individual games played
   */
  @Column({ name: 'games_played', default: 0 })
  @IsNumber()
  @Min(0)
  gamesPlayed: number;

  /**
   * Number of games that ended in draws
   */
  @Column({ name: 'games_drawn', default: 0 })
  @IsNumber()
  @Min(0)
  gamesDrawn: number;

  /**
   * Longest single game duration in this match
   */
  @Column({ name: 'longest_game_seconds', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  longestGameSeconds?: number;

  /**
   * Shortest single game duration in this match
   */
  @Column({ name: 'shortest_game_seconds', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shortestGameSeconds?: number;

  // Additional Data

  /**
   * Match notes and comments
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  notes?: string;

  /**
   * Match metadata (JSON)
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    streamUrl?: string;
    spectators?: string[];
    referee?: string;
    venue?: string;
    conditions?: string[];
    protests?: Array<{
      playerId: string;
      reason: string;
      timestamp: Date;
      resolved: boolean;
    }>;
    pauseHistory?: Array<{
      pausedAt: Date;
      resumedAt?: Date;
      reason: string;
    }>;
  };

  // Timestamps

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /**
   * All games played in this match
   */
  @OneToMany(() => Game, game => game.tournamentMatch, { cascade: true })
  games?: Game[];

  // Computed Properties

  /**
   * Check if match is completed
   */
  get isCompleted(): boolean {
    return this.status === MatchStatus.COMPLETED;
  }

  /**
   * Check if match is active
   */
  get isActive(): boolean {
    return this.status === MatchStatus.ACTIVE;
  }

  /**
   * Get games needed to win (majority of bestOf)
   */
  get gamesToWin(): number {
    return Math.ceil(this.bestOf / 2);
  }

  /**
   * Check if match has been decided
   */
  get isDecided(): boolean {
    return Math.max(this.player1Score, this.player2Score) >= this.gamesToWin;
  }

  /**
   * Get current leading player
   */
  get leadingPlayer(): User | null {
    if (this.player1Score > this.player2Score) {
      return this.player1;
    } else if (this.player2Score > this.player1Score) {
      return this.player2;
    }
    return null;
  }

  /**
   * Get match score in readable format
   */
  get scoreString(): string {
    return `${this.player1Score}-${this.player2Score}`;
  }

  /**
   * Check if match is overdue
   */
  get isOverdue(): boolean {
    return this.deadline ? new Date() > this.deadline : false;
  }

  /**
   * Get formatted duration
   */
  get formattedDuration(): string {
    if (!this.durationSeconds) return 'N/A';
    
    const hours = Math.floor(this.durationSeconds / 3600);
    const minutes = Math.floor((this.durationSeconds % 3600) / 60);
    const seconds = this.durationSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  // Methods

  /**
   * Start the match
   */
  start(): void {
    if (this.status !== MatchStatus.SCHEDULED) {
      throw new Error('Match is not scheduled');
    }
    
    this.status = MatchStatus.ACTIVE;
    this.startedAt = new Date();
  }

  /**
   * Record the result of a single game within the match
   */
  recordGameResult(winnerId: string | null): void {
    if (this.status !== MatchStatus.ACTIVE) {
      throw new Error('Match is not active');
    }
    
    if (this.isDecided) {
      throw new Error('Match is already decided');
    }
    
    this.gamesPlayed++;
    
    if (winnerId === this.player1.id) {
      this.player1Score++;
    } else if (winnerId === this.player2.id) {
      this.player2Score++;
    } else {
      // Draw - no score change
      this.gamesDrawn++;
    }
    
    // Check if match is now decided
    if (this.isDecided) {
      this.completeMatch();
    }
  }

  /**
   * Complete the match and determine winner
   */
  private completeMatch(): void {
    this.status = MatchStatus.COMPLETED;
    this.completedAt = new Date();
    
    // Determine winner and loser
    if (this.player1Score > this.player2Score) {
      this.winner = this.player1;
      this.loser = this.player2;
    } else if (this.player2Score > this.player1Score) {
      this.winner = this.player2;
      this.loser = this.player1;
    }
    
    // Calculate duration
    if (this.startedAt) {
      this.durationSeconds = Math.floor(
        (this.completedAt.getTime() - this.startedAt.getTime()) / 1000
      );
    }
  }

  /**
   * Award match by walkover
   */
  awardWalkover(winnerPlayerId: string, reason?: string): void {
    if (this.status === MatchStatus.COMPLETED) {
      throw new Error('Match is already completed');
    }
    
    this.status = MatchStatus.WALKOVER;
    this.completedAt = new Date();
    
    if (winnerPlayerId === this.player1.id) {
      this.winner = this.player1;
      this.loser = this.player2;
      this.player1Score = this.gamesToWin;
    } else if (winnerPlayerId === this.player2.id) {
      this.winner = this.player2;
      this.loser = this.player1;
      this.player2Score = this.gamesToWin;
    } else {
      throw new Error('Invalid winner player ID');
    }
    
    if (reason) {
      this.notes = `Walkover: ${reason}`;
    }
  }

  /**
   * Disqualify a player
   */
  disqualifyPlayer(playerId: string, reason: string): void {
    if (this.status === MatchStatus.COMPLETED) {
      throw new Error('Match is already completed');
    }
    
    this.status = MatchStatus.DISQUALIFIED;
    this.completedAt = new Date();
    
    if (playerId === this.player1.id) {
      this.winner = this.player2;
      this.loser = this.player1;
      this.player2Score = this.gamesToWin;
    } else if (playerId === this.player2.id) {
      this.winner = this.player1;
      this.loser = this.player2;
      this.player1Score = this.gamesToWin;
    } else {
      throw new Error('Invalid player ID for disqualification');
    }
    
    this.notes = `Disqualification: ${reason}`;
  }

  /**
   * Cancel the match
   */
  cancel(reason?: string): void {
    this.status = MatchStatus.CANCELLED;
    
    if (reason) {
      this.notes = `Cancelled: ${reason}`;
    }
  }

  /**
   * Postpone the match
   */
  postpone(newScheduledTime?: Date, reason?: string): void {
    this.status = MatchStatus.POSTPONED;
    
    if (newScheduledTime) {
      this.scheduledTime = newScheduledTime;
    }
    
    if (reason) {
      this.notes = `Postponed: ${reason}`;
    }
  }

  /**
   * Resume a postponed match
   */
  resume(): void {
    if (this.status !== MatchStatus.POSTPONED) {
      throw new Error('Can only resume postponed matches');
    }
    
    this.status = this.startedAt ? MatchStatus.ACTIVE : MatchStatus.SCHEDULED;
  }

  /**
   * Add spectator to match
   */
  addSpectator(userId: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    if (!this.metadata.spectators) {
      this.metadata.spectators = [];
    }
    
    if (!this.metadata.spectators.includes(userId)) {
      this.metadata.spectators.push(userId);
    }
  }

  /**
   * Remove spectator from match
   */
  removeSpectator(userId: string): void {
    if (this.metadata?.spectators) {
      this.metadata.spectators = this.metadata.spectators.filter(id => id !== userId);
    }
  }

  /**
   * File a protest
   */
  fileProtest(playerId: string, reason: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    if (!this.metadata.protests) {
      this.metadata.protests = [];
    }
    
    this.metadata.protests.push({
      playerId,
      reason,
      timestamp: new Date(),
      resolved: false,
    });
  }

  /**
   * Resolve a protest
   */
  resolveProtest(protestIndex: number, resolution?: string): void {
    if (this.metadata?.protests?.[protestIndex]) {
      this.metadata.protests[protestIndex].resolved = true;
      
      if (resolution && !this.notes) {
        this.notes = `Protest resolved: ${resolution}`;
      }
    }
  }

  /**
   * Update game timing statistics
   */
  updateGameStats(gameDurationSeconds: number): void {
    if (!this.longestGameSeconds || gameDurationSeconds > this.longestGameSeconds) {
      this.longestGameSeconds = gameDurationSeconds;
    }
    
    if (!this.shortestGameSeconds || gameDurationSeconds < this.shortestGameSeconds) {
      this.shortestGameSeconds = gameDurationSeconds;
    }
  }

  /**
   * Get match state for a specific player
   */
  getMatchStateForPlayer(playerId: string): {
    id: string;
    opponent: { id: string; displayName: string };
    score: { mine: number; opponent: number; bestOf: number; toWin: number };
    status: MatchStatus;
    timing: { 
      scheduled?: Date; 
      started?: Date; 
      deadline?: Date; 
      isOverdue: boolean;
    };
    canPlay: boolean;
    isMyTurn?: boolean;
  } {
    const isPlayer1 = this.player1.id === playerId;
    const isPlayer2 = this.player2.id === playerId;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Player is not part of this match');
    }
    
    const opponent = isPlayer1 ? this.player2 : this.player1;
    const myScore = isPlayer1 ? this.player1Score : this.player2Score;
    const opponentScore = isPlayer1 ? this.player2Score : this.player1Score;
    
    return {
      id: this.id,
      opponent: {
        id: opponent.id,
        displayName: opponent.displayName,
      },
      score: {
        mine: myScore,
        opponent: opponentScore,
        bestOf: this.bestOf,
        toWin: this.gamesToWin,
      },
      status: this.status,
      timing: {
        scheduled: this.scheduledTime,
        started: this.startedAt,
        deadline: this.deadline,
        isOverdue: this.isOverdue,
      },
      canPlay: this.status === MatchStatus.ACTIVE && !this.isDecided,
    };
  }

  /**
   * Get comprehensive match summary
   */
  getSummary(): {
    id: string;
    tournament: { id: string; name: string };
    round: number;
    matchNumber: number;
    players: { 
      player1: { id: string; displayName: string; score: number };
      player2: { id: string; displayName: string; score: number };
    };
    format: { bestOf: number; gamesToWin: number };
    status: MatchStatus;
    winner?: { id: string; displayName: string };
    timing: {
      scheduled?: Date;
      started?: Date;
      completed?: Date;
      duration?: string;
      isOverdue: boolean;
    };
    statistics: {
      gamesPlayed: number;
      gamesDrawn: number;
      longestGame?: number;
      shortestGame?: number;
    };
  } {
    return {
      id: this.id,
      tournament: {
        id: this.tournament.id,
        name: this.tournament.name,
      },
      round: this.round,
      matchNumber: this.matchNumber,
      players: {
        player1: {
          id: this.player1.id,
          displayName: this.player1.displayName,
          score: this.player1Score,
        },
        player2: {
          id: this.player2.id,
          displayName: this.player2.displayName,
          score: this.player2Score,
        },
      },
      format: {
        bestOf: this.bestOf,
        gamesToWin: this.gamesToWin,
      },
      status: this.status,
      winner: this.winner ? {
        id: this.winner.id,
        displayName: this.winner.displayName,
      } : undefined,
      timing: {
        scheduled: this.scheduledTime,
        started: this.startedAt,
        completed: this.completedAt,
        duration: this.formattedDuration,
        isOverdue: this.isOverdue,
      },
      statistics: {
        gamesPlayed: this.gamesPlayed,
        gamesDrawn: this.gamesDrawn,
        longestGame: this.longestGameSeconds,
        shortestGame: this.shortestGameSeconds,
      },
    };
  }
}