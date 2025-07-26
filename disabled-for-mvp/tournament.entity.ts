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
  IsString, 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsDate, 
  Min, 
  Max, 
  Length 
} from 'class-validator';
import { User } from './user.entity';
import { Game } from './game.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { TournamentMatch } from './tournament-match.entity';

/**
 * Tournament Status Enum - Current state of the tournament
 */
export enum TournamentStatus {
  DRAFT = 'DRAFT',                     // Tournament being created
  REGISTRATION = 'REGISTRATION',       // Open for player registration
  READY = 'READY',                     // All slots filled, ready to start
  ACTIVE = 'ACTIVE',                   // Tournament is running
  COMPLETED = 'COMPLETED',             // Tournament finished
  CANCELLED = 'CANCELLED',             // Tournament cancelled
  PAUSED = 'PAUSED',                   // Tournament temporarily paused
}

/**
 * Tournament Format Enum - Tournament bracket structure
 */
export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',   // Single knockout
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',   // Double knockout with losers bracket
  ROUND_ROBIN = 'ROUND_ROBIN',                 // Everyone plays everyone
  SWISS_SYSTEM = 'SWISS_SYSTEM',               // Swiss tournament system
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',       // Continuous challenge format
}

/**
 * Tournament Visibility Enum - Who can see and join the tournament
 */
export enum TournamentVisibility {
  PUBLIC = 'PUBLIC',       // Anyone can see and join
  PRIVATE = 'PRIVATE',     // Only invited players can join
  UNLISTED = 'UNLISTED',   // Visible only via direct link
}

/**
 * Tournament Entity - Rock-Paper-Scissors tournament management
 * 
 * @description Manages complete tournament lifecycle including registration,
 * bracket generation, match scheduling, and result tracking. Supports multiple
 * tournament formats and comprehensive statistics.
 * 
 * Features:
 * - Multiple tournament formats (Single/Double elimination, Round Robin, etc.)
 * - Flexible registration system with limits and requirements
 * - Comprehensive bracket and match management
 * - Prize pool and reward distribution
 * - Detailed statistics and analytics
 * - Tournament moderation and admin controls
 * 
 * @example
 * ```typescript
 * const tournament = new Tournament();
 * tournament.name = 'Summer Championship 2024';
 * tournament.format = TournamentFormat.SINGLE_ELIMINATION;
 * tournament.maxParticipants = 16;
 * tournament.createdBy = organizer;
 * await tournamentRepository.save(tournament);
 * ```
 */
@Entity('tournaments')
@Index(['status'])
@Index(['format'])
@Index(['visibility'])
@Index(['startTime'])
@Index(['createdBy'])
@Index(['registrationEndTime'])
@Index(['createdAt'])
@Check(`"max_participants" >= 2`)
@Check(`"min_participants" >= 2`)
@Check(`"min_participants" <= "max_participants"`)
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Basic Information

  /**
   * Tournament name/title
   */
  @Column({ length: 255 })
  @IsString()
  @Length(3, 255)
  name: string;

  /**
   * Tournament description
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  /**
   * Tournament format/structure
   */
  @Column({ type: 'enum', enum: TournamentFormat, default: TournamentFormat.SINGLE_ELIMINATION })
  @IsEnum(TournamentFormat)
  format: TournamentFormat;

  /**
   * Current tournament status
   */
  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.DRAFT })
  @IsEnum(TournamentStatus)
  status: TournamentStatus;

  /**
   * Tournament visibility and access control
   */
  @Column({ type: 'enum', enum: TournamentVisibility, default: TournamentVisibility.PUBLIC })
  @IsEnum(TournamentVisibility)
  visibility: TournamentVisibility;

  // Participation Settings

  /**
   * Maximum number of participants allowed
   */
  @Column({ name: 'max_participants', default: 8 })
  @IsNumber()
  @Min(2)
  @Max(256)
  maxParticipants: number;

  /**
   * Minimum participants required to start
   */
  @Column({ name: 'min_participants', default: 2 })
  @IsNumber()
  @Min(2)
  minParticipants: number;

  /**
   * Current number of registered participants
   */
  @Column({ name: 'current_participants', default: 0 })
  @IsNumber()
  @Min(0)
  currentParticipants: number;

  /**
   * Minimum ELO rating required to join
   */
  @Column({ name: 'min_rating', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minRating?: number;

  /**
   * Maximum ELO rating allowed to join
   */
  @Column({ name: 'max_rating', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRating?: number;

  // Game Settings

  /**
   * Number of rounds per match (best of X)
   */
  @Column({ name: 'rounds_per_match', default: 1 })
  @IsNumber()
  @Min(1)
  @Max(11) // Must be odd for decisive results
  roundsPerMatch: number;

  /**
   * Time limit for each move (in seconds)
   */
  @Column({ name: 'move_timeout_seconds', default: 60 })
  @IsNumber()
  @Min(10)
  @Max(300)
  moveTimeoutSeconds: number;

  /**
   * Time limit for match completion (in minutes)
   */
  @Column({ name: 'match_timeout_minutes', default: 10 })
  @IsNumber()
  @Min(5)
  @Max(60)
  matchTimeoutMinutes: number;

  // Scheduling

  /**
   * When registration ends
   */
  @Column({ name: 'registration_end_time', nullable: true })
  @IsOptional()
  @IsDate()
  registrationEndTime?: Date;

  /**
   * Scheduled start time
   */
  @Column({ name: 'start_time', nullable: true })
  @IsOptional()
  @IsDate()
  startTime?: Date;

  /**
   * When tournament actually started
   */
  @Column({ name: 'actual_start_time', nullable: true })
  @IsOptional()
  @IsDate()
  actualStartTime?: Date;

  /**
   * When tournament ended
   */
  @Column({ name: 'end_time', nullable: true })
  @IsOptional()
  @IsDate()
  endTime?: Date;

  // Results

  /**
   * Tournament winner
   */
  @ManyToOne(() => User, user => user.tournamentsWon, { 
    nullable: true, 
    onDelete: 'SET NULL',
    eager: true 
  })
  @JoinColumn({ name: 'winner_id' })
  winner?: User;

  /**
   * Runner-up (second place)
   */
  @ManyToOne(() => User, { 
    nullable: true, 
    onDelete: 'SET NULL',
    eager: true 
  })
  @JoinColumn({ name: 'runner_up_id' })
  runnerUp?: User;

  /**
   * Current round being played
   */
  @Column({ name: 'current_round', default: 0 })
  @IsNumber()
  @Min(0)
  currentRound: number;

  /**
   * Total number of rounds in tournament
   */
  @Column({ name: 'total_rounds', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalRounds?: number;

  // Organization

  /**
   * User who created the tournament
   */
  @ManyToOne(() => User, user => user.tournamentsCreated, { 
    nullable: false, 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  /**
   * Tournament moderators (JSON array of user IDs)
   */
  @Column({ type: 'json', nullable: true })
  moderators?: string[];

  // Prize and Rewards

  /**
   * Prize pool information
   */
  @Column({ type: 'json', nullable: true })
  prizePool?: {
    total: number;
    currency: string;
    distribution: {
      first: number;
      second?: number;
      third?: number;
      participation?: number;
    };
  };

  /**
   * Tournament tags for categorization
   */
  @Column({ type: 'json', nullable: true })
  tags?: string[];

  // Configuration

  /**
   * Tournament-specific settings
   */
  @Column({ type: 'json', nullable: true })
  settings?: {
    allowSpectators: boolean;
    enableChat: boolean;
    showBracket: boolean;
    autoStart: boolean;
    sendReminders: boolean;
    recordGames: boolean;
    streamEnabled: boolean;
    customRules?: string;
  };

  /**
   * Tournament statistics
   */
  @Column({ type: 'json', nullable: true })
  statistics?: {
    totalGames: number;
    totalMoves: number;
    averageGameDuration: number;
    mostUsedMove: 'ROCK' | 'PAPER' | 'SCISSORS';
    upsets: number; // Lower rated beating higher rated
    perfectGames: number; // Games without draws
    longestGame: number; // Duration in seconds
    shortestGame: number;
  };

  // Timestamps

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /**
   * All games played in this tournament
   */
  @OneToMany(() => Game, game => game.tournament, { cascade: true })
  games?: Game[];

  /**
   * Tournament participants
   */
  @OneToMany(() => TournamentParticipant, participant => participant.tournament, { cascade: true })
  participants?: TournamentParticipant[];

  /**
   * Tournament matches/brackets
   */
  @OneToMany(() => TournamentMatch, match => match.tournament, { cascade: true })
  matches?: TournamentMatch[];

  // Computed Properties

  /**
   * Check if tournament is accepting registrations
   */
  get isRegistrationOpen(): boolean {
    if (this.status !== TournamentStatus.REGISTRATION) {
      return false;
    }
    
    if (this.currentParticipants >= this.maxParticipants) {
      return false;
    }
    
    if (this.registrationEndTime && new Date() > this.registrationEndTime) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if tournament can start
   */
  get canStart(): boolean {
    return this.status === TournamentStatus.READY && 
           this.currentParticipants >= this.minParticipants;
  }

  /**
   * Check if tournament is active
   */
  get isActive(): boolean {
    return this.status === TournamentStatus.ACTIVE;
  }

  /**
   * Check if tournament is completed
   */
  get isCompleted(): boolean {
    return this.status === TournamentStatus.COMPLETED;
  }

  /**
   * Get percentage of slots filled
   */
  get fillPercentage(): number {
    return Math.round((this.currentParticipants / this.maxParticipants) * 100);
  }

  /**
   * Calculate estimated duration based on format and participants
   */
  get estimatedDuration(): number {
    const avgGameTime = 5; // minutes per game
    const setupTime = 10; // minutes between rounds
    
    switch (this.format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        const rounds = Math.ceil(Math.log2(this.currentParticipants));
        return rounds * avgGameTime + (rounds - 1) * setupTime;
      
      case TournamentFormat.ROUND_ROBIN:
        const totalGames = (this.currentParticipants * (this.currentParticipants - 1)) / 2;
        return totalGames * avgGameTime;
      
      default:
        return this.currentParticipants * avgGameTime;
    }
  }

  /**
   * Get tournament phase description
   */
  get currentPhase(): string {
    if (this.status === TournamentStatus.COMPLETED) {
      return 'Tournament Complete';
    }
    
    if (this.status !== TournamentStatus.ACTIVE) {
      return this.status.replace('_', ' ').toLowerCase();
    }
    
    if (!this.totalRounds) {
      return 'In Progress';
    }
    
    const roundNames = ['First Round', 'Second Round', 'Quarter-finals', 'Semi-finals', 'Finals'];
    const reverseIndex = this.totalRounds - this.currentRound;
    
    if (reverseIndex < roundNames.length) {
      return roundNames[reverseIndex];
    }
    
    return `Round ${this.currentRound}`;
  }

  // Methods

  /**
   * Check if user can join the tournament
   */
  canUserJoin(user: User): { canJoin: boolean; reason?: string } {
    if (!this.isRegistrationOpen) {
      return { canJoin: false, reason: 'Registration is closed' };
    }
    
    if (this.currentParticipants >= this.maxParticipants) {
      return { canJoin: false, reason: 'Tournament is full' };
    }
    
    if (this.minRating && user.eloRating < this.minRating) {
      return { canJoin: false, reason: `Minimum rating required: ${this.minRating}` };
    }
    
    if (this.maxRating && user.eloRating > this.maxRating) {
      return { canJoin: false, reason: `Maximum rating allowed: ${this.maxRating}` };
    }
    
    return { canJoin: true };
  }

  /**
   * Add a participant to the tournament
   */
  addParticipant(user: User): void {
    const { canJoin, reason } = this.canUserJoin(user);
    
    if (!canJoin) {
      throw new Error(reason);
    }
    
    this.currentParticipants++;
    
    // Check if tournament is ready to start
    if (this.currentParticipants >= this.minParticipants && 
        this.status === TournamentStatus.REGISTRATION) {
      this.status = TournamentStatus.READY;
    }
  }

  /**
   * Remove a participant from the tournament
   */
  removeParticipant(): void {
    if (this.currentParticipants > 0) {
      this.currentParticipants--;
    }
    
    // Revert status if needed
    if (this.currentParticipants < this.minParticipants && 
        this.status === TournamentStatus.READY) {
      this.status = TournamentStatus.REGISTRATION;
    }
  }

  /**
   * Start the tournament
   */
  start(): void {
    if (!this.canStart) {
      throw new Error('Tournament cannot be started');
    }
    
    this.status = TournamentStatus.ACTIVE;
    this.actualStartTime = new Date();
    this.currentRound = 1;
    
    // Calculate total rounds based on format
    this.calculateTotalRounds();
  }

  /**
   * Complete the tournament
   */
  complete(winner?: User, runnerUp?: User): void {
    this.status = TournamentStatus.COMPLETED;
    this.endTime = new Date();
    
    if (winner) {
      this.winner = winner;
    }
    
    if (runnerUp) {
      this.runnerUp = runnerUp;
    }
  }

  /**
   * Cancel the tournament
   */
  cancel(reason?: string): void {
    this.status = TournamentStatus.CANCELLED;
    
    if (reason && !this.settings) {
      this.settings = { allowSpectators: true, enableChat: true, showBracket: true, autoStart: false, sendReminders: true, recordGames: true, streamEnabled: false };
    }
    
    if (reason && this.settings) {
      (this.settings as any).cancellationReason = reason;
    }
  }

  /**
   * Pause the tournament
   */
  pause(reason?: string): void {
    if (this.status !== TournamentStatus.ACTIVE) {
      throw new Error('Can only pause active tournaments');
    }
    
    this.status = TournamentStatus.PAUSED;
    
    if (reason && !this.settings) {
      this.settings = { allowSpectators: true, enableChat: true, showBracket: true, autoStart: false, sendReminders: true, recordGames: true, streamEnabled: false };
    }
    
    if (reason && this.settings) {
      (this.settings as any).pauseReason = reason;
    }
  }

  /**
   * Resume a paused tournament
   */
  resume(): void {
    if (this.status !== TournamentStatus.PAUSED) {
      throw new Error('Can only resume paused tournaments');
    }
    
    this.status = TournamentStatus.ACTIVE;
  }

  /**
   * Advance to the next round
   */
  nextRound(): void {
    if (this.status !== TournamentStatus.ACTIVE) {
      throw new Error('Tournament is not active');
    }
    
    this.currentRound++;
  }

  /**
   * Check if user is a moderator
   */
  isModerator(userId: string): boolean {
    if (this.createdBy.id === userId) {
      return true;
    }
    
    return this.moderators?.includes(userId) || false;
  }

  /**
   * Add a moderator
   */
  addModerator(userId: string): void {
    if (!this.moderators) {
      this.moderators = [];
    }
    
    if (!this.moderators.includes(userId)) {
      this.moderators.push(userId);
    }
  }

  /**
   * Remove a moderator
   */
  removeModerator(userId: string): void {
    if (this.moderators) {
      this.moderators = this.moderators.filter(id => id !== userId);
    }
  }

  /**
   * Calculate total rounds based on format and participants
   */
  private calculateTotalRounds(): void {
    switch (this.format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        this.totalRounds = Math.ceil(Math.log2(this.currentParticipants));
        break;
      
      case TournamentFormat.ROUND_ROBIN:
        this.totalRounds = this.currentParticipants - 1;
        break;
      
      case TournamentFormat.DOUBLE_ELIMINATION:
        // More complex calculation for double elimination
        this.totalRounds = Math.ceil(Math.log2(this.currentParticipants)) * 2 - 1;
        break;
      
      default:
        this.totalRounds = Math.ceil(Math.log2(this.currentParticipants));
        break;
    }
  }

  /**
   * Get tournament summary for display
   */
  getSummary(): {
    basic: { id: string; name: string; status: string; format: string };
    participants: { current: number; max: number; fillPercentage: number };
    timing: { registrationEnd?: Date; startTime?: Date; estimatedDuration: number };
    settings: { roundsPerMatch: number; moveTimeout: number; visibility: string };
    results?: { winner?: string; runnerUp?: string; currentPhase: string };
  } {
    return {
      basic: {
        id: this.id,
        name: this.name,
        status: this.status,
        format: this.format,
      },
      participants: {
        current: this.currentParticipants,
        max: this.maxParticipants,
        fillPercentage: this.fillPercentage,
      },
      timing: {
        registrationEnd: this.registrationEndTime,
        startTime: this.startTime,
        estimatedDuration: this.estimatedDuration,
      },
      settings: {
        roundsPerMatch: this.roundsPerMatch,
        moveTimeout: this.moveTimeoutSeconds,
        visibility: this.visibility,
      },
      results: this.isActive || this.isCompleted ? {
        winner: this.winner?.displayName,
        runnerUp: this.runnerUp?.displayName,
        currentPhase: this.currentPhase,
      } : undefined,
    };
  }
}