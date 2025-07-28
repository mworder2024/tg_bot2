import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import {
  IsEmail,
  IsOptional,
  Length,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { UserStats } from "./user-stats.entity";
import { Game } from "./game.entity";
// import { Tournament } from './tournament.entity';
// import { TournamentParticipant } from './tournament-participant.entity';

/**
 * User Entity - Represents a Telegram user in the RPS Tournament Bot
 *
 * @description Core user entity that stores Telegram user information,
 * authentication data, and references to game statistics and participation history.
 *
 * Features:
 * - Telegram user integration with unique telegram_id
 * - User preferences and settings
 * - Soft delete capability
 * - Comprehensive indexing for performance
 * - Relationship management with games (tournaments disabled for MVP)
 *
 * @example
 * ```typescript
 * const user = new User();
 * user.telegramId = 123456789;
 * user.username = 'rps_champion';
 * user.firstName = 'John';
 * user.isActive = true;
 * await userRepository.save(user);
 * ```
 */
@Entity("users")
@Index(["telegramId"], { unique: true })
@Index(["username"])
@Index(["isActive"])
@Index(["createdAt"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Telegram user ID - unique identifier from Telegram
   * This is the primary way to identify users across sessions
   */
  @Column({ name: "telegram_id", type: "bigint", unique: true })
  @IsNumber()
  telegramId: number;

  /**
   * Telegram username (without @)
   * Optional as not all Telegram users have usernames
   */
  @Column({ length: 255, nullable: true })
  @IsOptional()
  @Length(3, 255)
  username?: string;

  /**
   * User's first name from Telegram profile
   */
  @Column({ name: "first_name", length: 255, nullable: true })
  @IsOptional()
  @Length(1, 255)
  firstName?: string;

  /**
   * User's last name from Telegram profile
   */
  @Column({ name: "last_name", length: 255, nullable: true })
  @IsOptional()
  @Length(1, 255)
  lastName?: string;

  /**
   * User's language code from Telegram (e.g., 'en', 'ru', 'es')
   */
  @Column({ name: "language_code", length: 10, default: "en" })
  @IsOptional()
  @Length(2, 10)
  languageCode: string;

  /**
   * Whether the user has Telegram Premium
   */
  @Column({ name: "is_premium", default: false })
  @IsBoolean()
  isPremium: boolean;

  /**
   * Whether the user account is active
   * Used for soft delete functionality
   */
  @Column({ name: "is_active", default: true })
  @IsBoolean()
  isActive: boolean;

  /**
   * User's email address (optional, for notifications)
   */
  @Column({ length: 255, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * User preferences stored as JSON
   * Contains notification settings, theme preferences, etc.
   */
  @Column({ type: "json", nullable: true })
  preferences?: {
    notifications: boolean;
    theme: "light" | "dark";
    language: string;
    // tournamentReminders: boolean; // Disabled for MVP
    gameResultNotifications: boolean;
  };

  /**
   * User's current ELO rating
   */
  @Column({ name: "elo_rating", default: 1200 })
  @IsNumber()
  @Min(100)
  @Max(3000)
  eloRating: number;

  /**
   * User's highest achieved ELO rating
   */
  @Column({ name: "peak_rating", default: 1200 })
  @IsNumber()
  @Min(100)
  @Max(3000)
  peakRating: number;

  /**
   * Last time user was active (sent a message or used the bot)
   */
  @Column({ name: "last_active_at", nullable: true })
  lastActiveAt?: Date;

  /**
   * Timestamp when user was created
   */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /**
   * Timestamp when user was last updated
   */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relationships

  /**
   * User's comprehensive statistics
   * One-to-one relationship with UserStats entity
   */
  @OneToOne(() => UserStats, (stats) => stats.user, {
    cascade: true,
    eager: false,
  })
  @JoinColumn()
  stats?: UserStats;

  /**
   * Games where user was player 1
   */
  @OneToMany(() => Game, (game) => game.player1, { cascade: false })
  gamesAsPlayer1?: Game[];

  /**
   * Games where user was player 2
   */
  @OneToMany(() => Game, (game) => game.player2, { cascade: false })
  gamesAsPlayer2?: Game[];

  /**
   * Games won by this user
   */
  @OneToMany(() => Game, (game) => game.winner, { cascade: false })
  gamesWon?: Game[];

  // Tournament relationships - Disabled for MVP
  // /**
  //  * Tournaments created by this user
  //  */
  // @OneToMany(() => Tournament, tournament => tournament.createdBy, { cascade: false })
  // tournamentsCreated?: Tournament[];

  // /**
  //  * Tournaments won by this user
  //  */
  // @OneToMany(() => Tournament, tournament => tournament.winner, { cascade: false })
  // tournamentsWon?: Tournament[];

  // /**
  //  * Tournament participations
  //  */
  // @OneToMany(() => TournamentParticipant, participant => participant.user, { cascade: false })
  // tournamentParticipations?: TournamentParticipant[];

  // Virtual properties

  /**
   * Get user's full name
   */
  get fullName(): string {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.length > 0
      ? parts.join(" ")
      : this.username || `User ${this.telegramId}`;
  }

  /**
   * Get user's display name for UI
   */
  get displayName(): string {
    return this.username ? `@${this.username}` : this.fullName;
  }

  /**
   * Check if user is a new player (less than 10 games)
   */
  get isNewPlayer(): boolean {
    return !this.stats || this.stats.gamesPlayed < 10;
  }

  /**
   * Get user's win rate as percentage
   */
  get winRate(): number {
    if (!this.stats || this.stats.gamesPlayed === 0) {
      return 0;
    }
    return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
  }

  // Methods

  /**
   * Update user's last active timestamp
   */
  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }

  /**
   * Soft delete the user account
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Reactivate a soft-deleted user account
   */
  reactivate(): void {
    this.isActive = true;
    this.updateLastActive();
  }

  /**
   * Update user preferences
   */
  updatePreferences(newPreferences: Partial<User["preferences"]>): void {
    this.preferences = {
      ...this.preferences,
      ...newPreferences,
    };
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    // Basic permission system - can be extended
    switch (permission) {
      // case 'create_tournament': // Disabled for MVP
      //   return this.isActive && (this.stats?.gamesPlayed || 0) >= 5;
      // case 'moderate_tournament': // Disabled for MVP
      //   return this.isActive && this.eloRating >= 1500;
      default:
        return this.isActive;
    }
  }

  /**
   * Get user's rank based on ELO rating
   */
  getRank(): string {
    if (this.eloRating >= 2000) return "Grandmaster";
    if (this.eloRating >= 1800) return "Master";
    if (this.eloRating >= 1600) return "Expert";
    if (this.eloRating >= 1400) return "Advanced";
    if (this.eloRating >= 1200) return "Intermediate";
    return "Beginner";
  }

  /**
   * Convert to safe JSON (excludes sensitive data)
   */
  toSafeJSON(): Partial<User> {
    const {
      id,
      telegramId,
      username,
      firstName,
      lastName,
      languageCode,
      isPremium,
      eloRating,
      peakRating,
      createdAt,
      lastActiveAt,
    } = this;

    return {
      id,
      telegramId,
      username,
      firstName,
      lastName,
      languageCode,
      isPremium,
      eloRating,
      peakRating,
      createdAt,
      lastActiveAt,
    };
  }
}
