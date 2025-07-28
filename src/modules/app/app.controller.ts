import { Controller, Get, HttpStatus } from "@nestjs/common";
// import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from "./app.service";

/**
 * Application root controller providing basic API information
 *
 * @description Handles root-level API endpoints for the RPS Tournament Bot:
 * - Application information and version
 * - Basic health status (detailed health in HealthModule)
 * - API welcome message
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/v1/
 * # Returns: { name: "RPS Tournament Bot", version: "1.0.0", ... }
 * ```
 *
 * @since 1.0.0
 * @see {@link HealthModule} for detailed health checks
 */
// @ApiTags('app')
@Controller()
export class AppController {
  /**
   * Initialize app controller with service dependency
   *
   * @param appService - Application service for business logic
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Get application information and status
   *
   * @description Returns basic application metadata including:
   * - Application name and version
   * - Current timestamp
   * - Environment information
   * - Available API endpoints overview
   *
   * @returns Application information object
   *
   * @example
   * ```typescript
   * const info = await fetch('/api/v1/').then(r => r.json());
   * console.log(info.name); // "RPS Tournament Bot"
   * console.log(info.version); // "1.0.0"
   * ```
   */
  @Get()
  // @ApiOperation({
  //   summary: 'Get application information',
  //   description: 'Returns basic application metadata and API information'
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Application information retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       name: { type: 'string', example: 'RPS Tournament Bot' },
  //       version: { type: 'string', example: '1.0.0' },
  //       description: { type: 'string', example: 'Professional Telegram Rock-Paper-Scissors Tournament Bot' },
  //       timestamp: { type: 'string', format: 'date-time' },
  //       environment: { type: 'string', example: 'development' },
  //       endpoints: {
  //         type: 'object',
  //         properties: {
  //           health: { type: 'string', example: '/api/v1/health' },
  //           docs: { type: 'string', example: '/api/docs' },
  //           tournaments: { type: 'string', example: '/api/v1/tournaments' },
  //           games: { type: 'string', example: '/api/v1/games' }
  //         }
  //       }
  //     }
  //   }
  // })
  getAppInfo() {
    return this.appService.getAppInfo();
  }

  /**
   * Simple ping endpoint for basic connectivity testing
   *
   * @description Lightweight endpoint for:
   * - Load balancer health checks
   * - Basic connectivity verification
   * - Uptime monitoring
   *
   * @returns Simple pong response with timestamp
   *
   * @example
   * ```bash
   * curl http://localhost:3000/api/v1/ping
   * # Returns: { message: "pong", timestamp: "2025-07-26T..." }
   * ```
   */
  @Get("ping")
  // @ApiOperation({
  //   summary: 'Simple ping endpoint',
  //   description: 'Basic connectivity test endpoint for monitoring'
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Pong response with timestamp',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       message: { type: 'string', example: 'pong' },
  //       timestamp: { type: 'string', format: 'date-time' }
  //     }
  //   }
  // })
  ping() {
    return this.appService.ping();
  }
}
