import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { IsNumber, Min, IsDate } from 'class-validator';
import { User } from './user.entity';

/**
 * UserStats Entity - Comprehensive user statistics for RPS gameplay
 * 
 * @description Stores detailed statistics for each user including game performance,
 * tournament participation, streaks, and historical data for analytics and ranking.
 * 
 * Features:
 * - Comprehensive game statistics tracking
 * - Tournament performance metrics
 * - Streak tracking (current and best)
 * - Time-based statistics (daily, weekly, monthly)
 * - Advanced analytics data points
 * 
 * @example
 * ```typescript
 * const stats = new UserStats();
 * stats.gamesPlayed = 100;
 * stats.gamesWon = 65;
 * stats.tournamentsWon = 3;
 * stats.currentStreak = 5;
 * await statsRepository.save(stats);
 * ```
 */
@Entity('user_stats')
@Index(['gamesPlayed'])
@Index(['gamesWon'])
@Index(['winRate'])
@Index(['tournamentsWon'])
@Index(['currentStreak'])
@Index(['bestStreak'])
@Index(['lastGameAt'])
export class UserStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the user these stats belong to
   */
  @OneToOne(() => User, user => user.stats, { onDelete: 'CASCADE' })
  user: User;

  // Game Statistics

  /**
   * Total number of games played
   */
  @Column({ name: 'games_played', default: 0 })
  @IsNumber()
  @Min(0)
  gamesPlayed: number;

  /**
   * Total number of games won
   */
  @Column({ name: 'games_won', default: 0 })
  @IsNumber()
  @Min(0)
  gamesWon: number;

  /**
   * Total number of games lost
   */
  @Column({ name: 'games_lost', default: 0 })
  @IsNumber()
  @Min(0)
  gamesLost: number;

  /**
   * Total number of games that ended in a draw
   */
  @Column({ name: 'games_drawn', default: 0 })
  @IsNumber()
  @Min(0)
  gamesDrawn: number;

  /**
   * Calculated win rate as percentage (0-100)
   */
  @Column({ name: 'win_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  winRate: number;

  // Move Statistics

  /**
   * Number of times user played ROCK
   */
  @Column({ name: 'rock_played', default: 0 })
  @IsNumber()
  @Min(0)
  rockPlayed: number;

  /**
   * Number of times user played PAPER
   */
  @Column({ name: 'paper_played', default: 0 })
  @IsNumber()
  @Min(0)
  paperPlayed: number;

  /**
   * Number of times user played SCISSORS
   */
  @Column({ name: 'scissors_played', default: 0 })
  @IsNumber()
  @Min(0)
  scissorsPlayed: number;

  /**
   * Wins with ROCK move
   */
  @Column({ name: 'rock_wins', default: 0 })
  @IsNumber()
  @Min(0)
  rockWins: number;

  /**
   * Wins with PAPER move
   */
  @Column({ name: 'paper_wins', default: 0 })
  @IsNumber()
  @Min(0)
  paperWins: number;

  /**
   * Wins with SCISSORS move
   */
  @Column({ name: 'scissors_wins', default: 0 })
  @IsNumber()
  @Min(0)
  scissorsWins: number;

  // Tournament Statistics

  /**
   * Total number of tournaments participated in
   */
  @Column({ name: 'tournaments_played', default: 0 })
  @IsNumber()
  @Min(0)
  tournamentsPlayed: number;

  /**
   * Total number of tournaments won
   */
  @Column({ name: 'tournaments_won', default: 0 })
  @IsNumber()
  @Min(0)
  tournamentsWon: number;

  /**
   * Total number of tournaments reached finals
   */
  @Column({ name: 'tournament_finals', default: 0 })
  @IsNumber()
  @Min(0)
  tournamentFinals: number;

  /**
   * Total number of tournaments reached semi-finals
   */
  @Column({ name: 'tournament_semifinals', default: 0 })
  @IsNumber()
  @Min(0)
  tournamentSemifinals: number;

  /**
   * Tournament win rate as percentage
   */
  @Column({ name: 'tournament_win_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  tournamentWinRate: number;

  // Streak Statistics

  /**
   * Current winning streak
   */
  @Column({ name: 'current_streak', default: 0 })
  @IsNumber()
  currentStreak: number;

  /**
   * Best winning streak ever achieved
   */
  @Column({ name: 'best_streak', default: 0 })
  @IsNumber()
  @Min(0)
  bestStreak: number;

  /**
   * Current losing streak
   */
  @Column({ name: 'current_losing_streak', default: 0 })
  @IsNumber()
  currentLosingStreak: number;

  /**
   * Worst losing streak ever
   */
  @Column({ name: 'worst_losing_streak', default: 0 })
  @IsNumber()
  @Min(0)
  worstLosingStreak: number;

  // Time-based Statistics

  /**
   * Games played today
   */
  @Column({ name: 'games_today', default: 0 })
  @IsNumber()
  @Min(0)
  gamesToday: number;

  /**
   * Games played this week
   */
  @Column({ name: 'games_this_week', default: 0 })
  @IsNumber()
  @Min(0)
  gamesThisWeek: number;

  /**
   * Games played this month
   */
  @Column({ name: 'games_this_month', default: 0 })
  @IsNumber()
  @Min(0)
  gamesThisMonth: number;

  /**
   * Most games played in a single day
   */
  @Column({ name: 'best_daily_games', default: 0 })
  @IsNumber()
  @Min(0)
  bestDailyGames: number;

  // Advanced Statistics

  /**
   * Average game duration in seconds
   */
  @Column({ name: 'avg_game_duration', type: 'decimal', precision: 8, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  avgGameDuration: number;

  /**
   * Total time spent playing (in seconds)
   */
  @Column({ name: 'total_play_time', default: 0 })
  @IsNumber()
  @Min(0)
  totalPlayTime: number;

  /**
   * Preferred move (most used move)
   */
  @Column({ name: 'preferred_move', length: 20, nullable: true })
  preferredMove?: 'ROCK' | 'PAPER' | 'SCISSORS';

  /**
   * Most successful move (highest win rate)
   */
  @Column({ name: 'most_successful_move', length: 20, nullable: true })
  mostSuccessfulMove?: 'ROCK' | 'PAPER' | 'SCISSORS';

  // Timestamps

  /**
   * Last time user played a game
   */
  @Column({ name: 'last_game_at', nullable: true })
  @IsDate()
  lastGameAt?: Date;

  /**
   * Last time user won a game
   */
  @Column({ name: 'last_win_at', nullable: true })
  @IsDate()
  lastWinAt?: Date;

  /**
   * Last time user won a tournament
   */
  @Column({ name: 'last_tournament_win_at', nullable: true })
  @IsDate()
  lastTournamentWinAt?: Date;

  /**
   * When statistics were created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * When statistics were last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed Properties

  /**
   * Calculate win percentage as a number between 0 and 1
   */
  get winPercentage(): number {
    return this.gamesPlayed > 0 ? this.gamesWon / this.gamesPlayed : 0;
  }

  /**
   * Calculate tournament win percentage
   */
  get tournamentWinPercentage(): number {
    return this.tournamentsPlayed > 0 ? this.tournamentsWon / this.tournamentsPlayed : 0;
  }

  /**
   * Get the user's most played move
   */
  get mostPlayedMove(): 'ROCK' | 'PAPER' | 'SCISSORS' | null {
    const moves = {
      ROCK: this.rockPlayed,
      PAPER: this.paperPlayed,
      SCISSORS: this.scissorsPlayed,
    };

    let maxMove = null;
    let maxCount = 0;

    for (const [move, count] of Object.entries(moves)) {
      if (count > maxCount) {
        maxCount = count;
        maxMove = move as 'ROCK' | 'PAPER' | 'SCISSORS';
      }
    }

    return maxMove;
  }

  /**
   * Get win rate for each move
   */
  get moveWinRates(): { rock: number; paper: number; scissors: number } {
    return {
      rock: this.rockPlayed > 0 ? this.rockWins / this.rockPlayed : 0,
      paper: this.paperPlayed > 0 ? this.paperWins / this.paperPlayed : 0,
      scissors: this.scissorsPlayed > 0 ? this.scissorsWins / this.scissorsPlayed : 0,
    };
  }

  /**
   * Check if user is on a winning streak
   */
  get isOnWinningStreak(): boolean {
    return this.currentStreak > 0;
  }

  /**
   * Check if user is on a losing streak
   */
  get isOnLosingStreak(): boolean {
    return this.currentLosingStreak > 0;
  }

  // Methods

  /**
   * Record a game result and update statistics
   */
  recordGameResult(
    result: 'win' | 'loss' | 'draw',
    move: 'ROCK' | 'PAPER' | 'SCISSORS',
    gameDuration?: number
  ): void {
    // Update basic counters
    this.gamesPlayed++;
    this.gamesToday++;
    this.gamesThisWeek++;
    this.gamesThisMonth++;

    // Update move counters
    switch (move) {
      case 'ROCK':
        this.rockPlayed++;
        break;
      case 'PAPER':
        this.paperPlayed++;
        break;
      case 'SCISSORS':
        this.scissorsPlayed++;
        break;
    }

    // Update result counters and streaks
    switch (result) {
      case 'win':
        this.gamesWon++;
        if (move === 'ROCK') this.rockWins++;
        if (move === 'PAPER') this.paperWins++;
        if (move === 'SCISSORS') this.scissorsWins++;
        
        this.currentStreak++;
        this.currentLosingStreak = 0;
        
        if (this.currentStreak > this.bestStreak) {
          this.bestStreak = this.currentStreak;
        }
        
        this.lastWinAt = new Date();
        break;
        
      case 'loss':
        this.gamesLost++;
        this.currentStreak = 0;
        this.currentLosingStreak++;
        
        if (this.currentLosingStreak > this.worstLosingStreak) {
          this.worstLosingStreak = this.currentLosingStreak;
        }
        break;
        
      case 'draw':
        this.gamesDrawn++;
        // Draws don't affect streaks
        break;
    }

    // Update calculated fields
    this.winRate = (this.gamesWon / this.gamesPlayed) * 100;
    this.lastGameAt = new Date();

    // Update game duration stats
    if (gameDuration) {
      const totalDuration = (this.avgGameDuration * (this.gamesPlayed - 1)) + gameDuration;
      this.avgGameDuration = totalDuration / this.gamesPlayed;
      this.totalPlayTime += gameDuration;
    }

    // Update preferred and most successful moves
    this.updatePreferredMove();
    this.updateMostSuccessfulMove();
  }

  /**
   * Record tournament participation
   */
  recordTournamentResult(
    placement: 'winner' | 'finalist' | 'semifinalist' | 'participant'
  ): void {
    this.tournamentsPlayed++;

    switch (placement) {
      case 'winner':
        this.tournamentsWon++;
        this.tournamentFinals++;
        this.tournamentSemifinals++;
        this.lastTournamentWinAt = new Date();
        break;
      case 'finalist':
        this.tournamentFinals++;
        this.tournamentSemifinals++;
        break;
      case 'semifinalist':
        this.tournamentSemifinals++;
        break;
    }

    this.tournamentWinRate = (this.tournamentsWon / this.tournamentsPlayed) * 100;
  }

  /**
   * Reset daily statistics (called by cron job)
   */
  resetDailyStats(): void {
    if (this.gamesToday > this.bestDailyGames) {
      this.bestDailyGames = this.gamesToday;
    }
    this.gamesToday = 0;
  }

  /**
   * Reset weekly statistics
   */
  resetWeeklyStats(): void {
    this.gamesThisWeek = 0;
  }

  /**
   * Reset monthly statistics
   */
  resetMonthlyStats(): void {
    this.gamesThisMonth = 0;
  }

  /**
   * Update preferred move based on usage
   */
  private updatePreferredMove(): void {
    const mostPlayed = this.mostPlayedMove;
    if (mostPlayed) {
      this.preferredMove = mostPlayed;
    }
  }

  /**
   * Update most successful move based on win rates
   */
  private updateMostSuccessfulMove(): void {
    const winRates = this.moveWinRates;
    let bestMove: 'ROCK' | 'PAPER' | 'SCISSORS' | null = null;
    let bestRate = 0;

    for (const [move, rate] of Object.entries(winRates)) {
      if (rate > bestRate) {
        bestRate = rate;
        bestMove = move.toUpperCase() as 'ROCK' | 'PAPER' | 'SCISSORS';
      }
    }

    if (bestMove) {
      this.mostSuccessfulMove = bestMove;
    }
  }

  /**
   * Get comprehensive statistics summary
   */
  getSummary(): {
    games: { played: number; won: number; lost: number; drawn: number; winRate: number };
    tournaments: { played: number; won: number; finals: number; winRate: number };
    streaks: { current: number; best: number; currentLosing: number; worst: number };
    moves: { preferred?: string; mostSuccessful?: string; winRates: Record<string, number> };
    activity: { today: number; thisWeek: number; thisMonth: number; lastGame?: Date };
  } {
    return {
      games: {
        played: this.gamesPlayed,
        won: this.gamesWon,
        lost: this.gamesLost,
        drawn: this.gamesDrawn,
        winRate: this.winRate,
      },
      tournaments: {
        played: this.tournamentsPlayed,
        won: this.tournamentsWon,
        finals: this.tournamentFinals,
        winRate: this.tournamentWinRate,
      },
      streaks: {
        current: this.currentStreak,
        best: this.bestStreak,
        currentLosing: this.currentLosingStreak,
        worst: this.worstLosingStreak,
      },
      moves: {
        preferred: this.preferredMove,
        mostSuccessful: this.mostSuccessfulMove,
        winRates: this.moveWinRates,
      },
      activity: {
        today: this.gamesToday,
        thisWeek: this.gamesThisWeek,
        thisMonth: this.gamesThisMonth,
        lastGame: this.lastGameAt,
      },
    };
  }
}