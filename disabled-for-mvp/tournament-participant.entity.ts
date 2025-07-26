import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsDate, 
  Min 
} from 'class-validator';
import { User } from './user.entity';
import { Tournament } from './tournament.entity';

/**
 * Participant Status Enum - Current status in tournament
 */
export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',     // Registered but tournament not started
  ACTIVE = 'ACTIVE',             // Currently competing
  ELIMINATED = 'ELIMINATED',     // Knocked out of tournament
  WINNER = 'WINNER',             // Won the tournament
  DISQUALIFIED = 'DISQUALIFIED', // Disqualified by moderator
  WITHDREW = 'WITHDREW',         // Voluntarily withdrew
  NO_SHOW = 'NO_SHOW',          // Didn't show up for matches
}

/**
 * TournamentParticipant Entity - Links users to tournaments with participation data
 * 
 * @description Tracks individual user participation in tournaments including
 * registration details, performance statistics, and current status. Enables
 * comprehensive tournament analytics and player progress tracking.
 * 
 * Features:
 * - Complete participation lifecycle tracking
 * - Performance statistics and analytics
 * - Seeding and bracket positioning
 * - Prize and reward tracking
 * - Detailed match history within tournament
 * 
 * @example
 * ```typescript
 * const participant = new TournamentParticipant();
 * participant.user = player;
 * participant.tournament = tournament;
 * participant.status = ParticipantStatus.REGISTERED;
 * participant.seed = 5;
 * await participantRepository.save(participant);
 * ```
 */
@Entity('tournament_participants')
@Unique(['tournament', 'user'])
@Index(['tournament', 'status'])
@Index(['tournament', 'seed'])
@Index(['tournament', 'finalPosition'])
@Index(['user', 'status'])
@Index(['registeredAt'])
export class TournamentParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Core Relationships

  /**
   * The tournament this participation record belongs to
   */
  @ManyToOne(() => Tournament, tournament => tournament.participants, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: false 
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  /**
   * The user participating in the tournament
   */
  @ManyToOne(() => User, user => user.tournamentParticipations, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Status and Positioning

  /**
   * Current status of the participant
   */
  @Column({ type: 'enum', enum: ParticipantStatus, default: ParticipantStatus.REGISTERED })
  @IsEnum(ParticipantStatus)
  status: ParticipantStatus;

  /**
   * Tournament seed/ranking (1 = highest seed)
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seed?: number;

  /**
   * Final tournament position (1 = winner, 2 = runner-up, etc.)
   */
  @Column({ name: 'final_position', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  finalPosition?: number;

  /**
   * Points earned in tournament (for Swiss/Round Robin formats)
   */
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  points: number;

  /**
   * Tiebreaker scores (JSON array for multiple tiebreakers)
   */
  @Column({ type: 'json', nullable: true })
  tiebreakers?: number[];

  // Performance Statistics

  /**
   * Number of matches played in this tournament
   */
  @Column({ name: 'matches_played', default: 0 })
  @IsNumber()
  @Min(0)
  matchesPlayed: number;

  /**
   * Number of matches won
   */
  @Column({ name: 'matches_won', default: 0 })
  @IsNumber()
  @Min(0)
  matchesWon: number;

  /**
   * Number of matches lost
   */
  @Column({ name: 'matches_lost', default: 0 })
  @IsNumber()
  @Min(0)
  matchesLost: number;

  /**
   * Number of individual games played (sum of all match games)
   */
  @Column({ name: 'games_played', default: 0 })
  @IsNumber()
  @Min(0)
  gamesPlayed: number;

  /**
   * Number of individual games won
   */
  @Column({ name: 'games_won', default: 0 })
  @IsNumber()
  @Min(0)
  gamesWon: number;

  /**
   * Number of individual games lost
   */
  @Column({ name: 'games_lost', default: 0 })
  @IsNumber()
  @Min(0)
  gamesLost: number;

  /**
   * Number of draws in individual games
   */
  @Column({ name: 'games_drawn', default: 0 })
  @IsNumber()
  @Min(0)
  gamesDrawn: number;

  // Move Statistics

  /**
   * Times ROCK was played in this tournament
   */
  @Column({ name: 'rock_played', default: 0 })
  @IsNumber()
  @Min(0)
  rockPlayed: number;

  /**
   * Times PAPER was played in this tournament
   */
  @Column({ name: 'paper_played', default: 0 })
  @IsNumber()
  @Min(0)
  paperPlayed: number;

  /**
   * Times SCISSORS was played in this tournament
   */
  @Column({ name: 'scissors_played', default: 0 })
  @IsNumber()
  @Min(0)
  scissorsPlayed: number;

  // Performance Metrics

  /**
   * ELO rating at tournament start
   */
  @Column({ name: 'starting_rating', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startingRating?: number;

  /**
   * ELO rating change during tournament
   */
  @Column({ name: 'rating_change', default: 0 })
  @IsNumber()
  ratingChange: number;

  /**
   * Performance rating in this tournament
   */
  @Column({ name: 'performance_rating', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceRating?: number;

  /**
   * Strength of schedule (average opponent rating)
   */
  @Column({ name: 'strength_of_schedule', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  strengthOfSchedule?: number;

  // Timing

  /**
   * When user registered for tournament
   */
  @Column({ name: 'registered_at', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate()
  registeredAt: Date;

  /**
   * When participant was eliminated (if applicable)
   */
  @Column({ name: 'eliminated_at', nullable: true })
  @IsOptional()
  @IsDate()
  eliminatedAt?: Date;

  /**
   * Total time spent in tournament matches
   */
  @Column({ name: 'total_match_time', default: 0 })
  @IsNumber()
  @Min(0)
  totalMatchTime: number;

  /**
   * Average time per game in seconds
   */
  @Column({ name: 'avg_game_time', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgGameTime?: number;

  // Rewards and Recognition

  /**
   * Prize money earned (if any)
   */
  @Column({ name: 'prize_earned', default: 0 })
  @IsNumber()
  @Min(0)
  prizeEarned: number;

  /**
   * Achievement badges earned in this tournament
   */
  @Column({ type: 'json', nullable: true })
  achievements?: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
  }>;

  // Additional Data

  /**
   * Notes from tournament organizers
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  notes?: string;

  /**
   * Custom participant data (JSON)
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    preferences?: {
      notifications: boolean;
      publicStats: boolean;
    };
    specialConditions?: string[];
    coaching?: {
      coachId: string;
      coachName: string;
    };
    team?: {
      teamId: string;
      teamName: string;
    };
  };

  // Timestamps

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed Properties

  /**
   * Calculate match win rate
   */
  get matchWinRate(): number {
    return this.matchesPlayed > 0 ? this.matchesWon / this.matchesPlayed : 0;
  }

  /**
   * Calculate game win rate
   */
  get gameWinRate(): number {
    return this.gamesPlayed > 0 ? this.gamesWon / this.gamesPlayed : 0;
  }

  /**
   * Check if participant is still active in tournament
   */
  get isActive(): boolean {
    return this.status === ParticipantStatus.ACTIVE || 
           this.status === ParticipantStatus.REGISTERED;
  }

  /**
   * Check if participant is eliminated
   */
  get isEliminated(): boolean {
    return this.status === ParticipantStatus.ELIMINATED ||
           this.status === ParticipantStatus.DISQUALIFIED ||
           this.status === ParticipantStatus.WITHDREW ||
           this.status === ParticipantStatus.NO_SHOW;
  }

  /**
   * Get most played move
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
   * Get total moves played
   */
  get totalMoves(): number {
    return this.rockPlayed + this.paperPlayed + this.scissorsPlayed;
  }

  /**
   * Get move distribution as percentages
   */
  get moveDistribution(): { rock: number; paper: number; scissors: number } {
    const total = this.totalMoves;
    
    if (total === 0) {
      return { rock: 0, paper: 0, scissors: 0 };
    }
    
    return {
      rock: Math.round((this.rockPlayed / total) * 100),
      paper: Math.round((this.paperPlayed / total) * 100),
      scissors: Math.round((this.scissorsPlayed / total) * 100),
    };
  }

  // Methods

  /**
   * Record a match result
   */
  recordMatchResult(
    won: boolean, 
    gameResults: Array<{ won: boolean; move: 'ROCK' | 'PAPER' | 'SCISSORS' }>
  ): void {
    this.matchesPlayed++;
    
    if (won) {
      this.matchesWon++;
    } else {
      this.matchesLost++;
    }
    
    // Record individual game results
    for (const game of gameResults) {
      this.gamesPlayed++;
      
      if (game.won) {
        this.gamesWon++;
      } else {
        this.gamesLost++;
      }
      
      // Record move
      switch (game.move) {
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
    }
    
    // Update average game time
    if (this.totalMatchTime > 0 && this.gamesPlayed > 0) {
      this.avgGameTime = this.totalMatchTime / this.gamesPlayed;
    }
  }

  /**
   * Eliminate participant from tournament
   */
  eliminate(reason?: 'lost' | 'disqualified' | 'withdrew' | 'no_show'): void {
    this.eliminatedAt = new Date();
    
    switch (reason) {
      case 'disqualified':
        this.status = ParticipantStatus.DISQUALIFIED;
        break;
      case 'withdrew':
        this.status = ParticipantStatus.WITHDREW;
        break;
      case 'no_show':
        this.status = ParticipantStatus.NO_SHOW;
        break;
      default:
        this.status = ParticipantStatus.ELIMINATED;
        break;
    }
  }

  /**
   * Set final tournament position and status
   */
  setFinalPosition(position: number): void {
    this.finalPosition = position;
    
    if (position === 1) {
      this.status = ParticipantStatus.WINNER;
    } else if (this.status === ParticipantStatus.ACTIVE) {
      this.status = ParticipantStatus.ELIMINATED;
      this.eliminatedAt = new Date();
    }
  }

  /**
   * Award prize money
   */
  awardPrize(amount: number): void {
    this.prizeEarned = amount;
  }

  /**
   * Add achievement
   */
  addAchievement(achievement: { id: string; name: string; description: string }): void {
    if (!this.achievements) {
      this.achievements = [];
    }
    
    // Check if achievement already exists
    const exists = this.achievements.some(a => a.id === achievement.id);
    
    if (!exists) {
      this.achievements.push({
        ...achievement,
        earnedAt: new Date(),
      });
    }
  }

  /**
   * Update ELO rating change
   */
  updateRatingChange(newRating: number): void {
    if (this.startingRating) {
      this.ratingChange = newRating - this.startingRating;
    }
  }

  /**
   * Calculate performance rating based on opponent strength and results
   */
  calculatePerformanceRating(opponentRatings: number[]): void {
    if (opponentRatings.length === 0) {
      return;
    }
    
    // Calculate strength of schedule
    this.strengthOfSchedule = opponentRatings.reduce((sum, rating) => sum + rating, 0) / opponentRatings.length;
    
    // Simple performance rating calculation
    // This could be enhanced with more sophisticated algorithms
    const scorePercentage = this.gameWinRate;
    const expectedScore = 0.5; // Simplified expectation
    const ratingDifference = 400 * Math.log10((scorePercentage + 0.001) / (1 - scorePercentage + 0.001));
    
    this.performanceRating = Math.round(this.strengthOfSchedule + ratingDifference);
  }

  /**
   * Get participant summary for display
   */
  getSummary(): {
    user: { id: string; displayName: string; rating: number };
    tournament: { id: string; name: string };
    status: { current: string; position?: number; seed?: number };
    performance: { 
      matches: { played: number; won: number; winRate: number };
      games: { played: number; won: number; winRate: number };
      moves: { rock: number; paper: number; scissors: number; mostPlayed?: string };
    };
    ratings: { 
      starting?: number; 
      change: number; 
      performance?: number; 
      strengthOfSchedule?: number;
    };
    rewards: { prize: number; achievements: number };
  } {
    return {
      user: {
        id: this.user.id,
        displayName: this.user.displayName,
        rating: this.user.eloRating,
      },
      tournament: {
        id: this.tournament.id,
        name: this.tournament.name,
      },
      status: {
        current: this.status,
        position: this.finalPosition,
        seed: this.seed,
      },
      performance: {
        matches: {
          played: this.matchesPlayed,
          won: this.matchesWon,
          winRate: Math.round(this.matchWinRate * 100),
        },
        games: {
          played: this.gamesPlayed,
          won: this.gamesWon,
          winRate: Math.round(this.gameWinRate * 100),
        },
        moves: {
          rock: this.rockPlayed,
          paper: this.paperPlayed,
          scissors: this.scissorsPlayed,
          mostPlayed: this.mostPlayedMove || undefined,
        },
      },
      ratings: {
        starting: this.startingRating,
        change: this.ratingChange,
        performance: this.performanceRating,
        strengthOfSchedule: this.strengthOfSchedule,
      },
      rewards: {
        prize: this.prizeEarned,
        achievements: this.achievements?.length || 0,
      },
    };
  }
}