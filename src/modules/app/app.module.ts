import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bull";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";
import { GameModule } from "../game/game.module";
// import { TournamentModule } from '../tournament/tournament.module';
import { BotModule } from "../bot/bot.module";
import { configValidation } from "../../config/config.validation.mvp";

/**
 * Root application module with comprehensive modular architecture
 *
 * @description Main application module that orchestrates all feature modules
 * following NestJS best practices for enterprise applications:
 *
 * - **Core Modules**: User, Game, Tournament, Bot (business logic)
 * - **Infrastructure Modules**: Database, Cache, Queue, Logging (system services)
 * - **Feature Modules**: Notification, Leaderboard, Analytics, Admin (specialized features)
 * - **Health Module**: System monitoring and health checks
 *
 * @example
 * ```typescript
 * // Module automatically bootstrapped in main.ts
 * import { AppModule } from './modules/app/app.module';
 * const app = await NestFactory.create(AppModule);
 * ```
 *
 * @since 1.0.0
 * @see {@link main.ts} for application bootstrap
 */
@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: configValidation,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Rate limiting for security
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT) || 100,
      },
    ]),

    // Infrastructure modules (foundational services)
    DatabaseModule,
    // CacheModule, // Disabled for MVP
    // QueueModule, // Disabled for MVP
    // LoggingModule, // Disabled for MVP
    // HealthModule, // Disabled for MVP

    // Core business modules
    UserModule,
    GameModule,
    // TournamentModule, // Disabled for MVP (SQLite compatibility)

    // Bot module - only in development or when BOT_TOKEN is properly configured
    ...(process.env.BOT_TOKEN && process.env.BOT_TOKEN !== "your_bot_token_here"
      ? [BotModule]
      : []),

    // Feature modules (disabled for MVP)
    // NotificationModule,
    // LeaderboardModule,
    // AnalyticsModule,
    // AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  /**
   * Module configuration hook for advanced setup
   *
   * @description Called during module initialization to perform
   * any additional configuration or validation required
   */
  constructor() {
    // Module initialized successfully
  }
}
