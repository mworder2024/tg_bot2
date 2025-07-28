import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Application service providing core application information and utilities
 *
 * @description Central service for application-level operations:
 * - Application metadata and versioning
 * - Environment information
 * - Basic connectivity testing
 * - System information aggregation
 *
 * @example
 * ```typescript
 * @Controller()
 * class MyController {
 *   constructor(private appService: AppService) {}
 *
 *   @Get('info')
 *   getInfo() {
 *     return this.appService.getAppInfo();
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @see {@link AppController} for HTTP endpoints
 */
@Injectable()
export class AppService {
  /**
   * Initialize application service with configuration
   *
   * @param configService - NestJS configuration service for environment variables
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get comprehensive application information
   *
   * @description Aggregates application metadata including:
   * - Package information (name, version, description)
   * - Runtime environment details
   * - Available API endpoints
   * - System timestamp
   *
   * @returns Complete application information object
   *
   * @example
   * ```typescript
   * const info = this.appService.getAppInfo();
   * console.log(info.name); // "RPS Tournament Bot"
   * console.log(info.environment); // "development"
   * console.log(info.endpoints.health); // "/api/v1/health"
   * ```
   */
  getAppInfo() {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    const port = this.configService.get<number>("PORT", 3000);

    return {
      name: this.configService.get<string>("APP_NAME", "RPS Tournament Bot"),
      version: this.configService.get<string>("APP_VERSION", "1.0.0"),
      description:
        "Professional Telegram Rock-Paper-Scissors Tournament Bot with NestJS",
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      port,
      endpoints: {
        health: "/api/v1/health",
        docs: nodeEnv === "development" ? "/api/docs" : null,
        tournaments: "/api/v1/tournaments",
        games: "/api/v1/games",
        users: "/api/v1/users",
        bot: "/api/v1/bot",
        admin: "/api/v1/admin",
        leaderboard: "/api/v1/leaderboard",
        analytics: "/api/v1/analytics",
      },
      features: {
        tournamentFormats: ["single-elimination"],
        supportedPlayerCounts: [4, 8, 16, 32, 64],
        gameTypes: ["rock-paper-scissors"],
        realTimeUpdates: true,
        adminDashboard: true,
        spectatorMode: true,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  /**
   * Simple ping response for connectivity testing
   *
   * @description Lightweight method for:
   * - Health check integration
   * - Load balancer monitoring
   * - Basic uptime verification
   * - Response time measurement
   *
   * @returns Pong message with current timestamp
   *
   * @example
   * ```typescript
   * const response = this.appService.ping();
   * console.log(response.message); // "pong"
   * console.log(response.timestamp); // "2025-07-26T..."
   * ```
   */
  ping() {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>("NODE_ENV", "development"),
    };
  }

  /**
   * Get application health status
   *
   * @description Basic health information for:
   * - Service discovery
   * - Load balancer decisions
   * - Monitoring systems
   *
   * @returns Health status object
   *
   * @example
   * ```typescript
   * const health = this.appService.getHealth();
   * console.log(health.status); // "healthy"
   * ```
   */
  getHealth() {
    const memoryUsage = process.memoryUsage();
    const memoryUsageInMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memoryUsageInMB,
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      environment: this.configService.get<string>("NODE_ENV", "development"),
      version: this.configService.get<string>("APP_VERSION", "1.0.0"),
    };
  }
}
