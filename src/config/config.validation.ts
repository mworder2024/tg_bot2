import * as Joi from "joi";

/**
 * Environment configuration validation schema
 *
 * @description Joi schema for validating environment variables to ensure:
 * - Required variables are present
 * - Data types are correct
 * - Values are within acceptable ranges
 * - Security requirements are met
 *
 * @example
 * ```typescript
 * // Automatically used by ConfigModule in app.module.ts
 * ConfigModule.forRoot({
 *   validationSchema: configValidation,
 *   validationOptions: { abortEarly: false }
 * })
 * ```
 *
 * @since 1.0.0
 * @see {@link AppModule} for configuration setup
 */
export const configValidation = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "staging")
    .default("development")
    .description("Application environment"),

  PORT: Joi.number().port().default(3000).description("Application port"),

  APP_NAME: Joi.string()
    .default("RPS Tournament Bot")
    .description("Application name"),

  APP_VERSION: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .default("1.0.0")
    .description("Application version (semver)"),

  // Database Configuration
  DATABASE_URL: Joi.string()
    .uri({ scheme: "postgresql" })
    .required()
    .description("PostgreSQL connection URL"),

  DATABASE_HOST: Joi.string()
    .hostname()
    .default("localhost")
    .description("Database host"),

  DATABASE_PORT: Joi.number().port().default(5432).description("Database port"),

  DATABASE_USERNAME: Joi.string()
    .alphanum()
    .min(3)
    .max(63)
    .required()
    .description("Database username"),

  DATABASE_PASSWORD: Joi.string()
    .min(8)
    .required()
    .description("Database password"),

  DATABASE_NAME: Joi.string()
    .alphanum()
    .min(3)
    .max(63)
    .required()
    .description("Database name"),

  // Redis Configuration
  REDIS_URL: Joi.string()
    .uri({ scheme: "redis" })
    .default("redis://localhost:6379")
    .description("Redis connection URL"),

  REDIS_HOST: Joi.string()
    .hostname()
    .default("localhost")
    .description("Redis host"),

  REDIS_PORT: Joi.number().port().default(6379).description("Redis port"),

  REDIS_PASSWORD: Joi.string()
    .allow("")
    .description("Redis password (optional)"),

  // Telegram Bot Configuration
  BOT_TOKEN: Joi.string()
    .pattern(/^\d+:[A-Za-z0-9_-]{35}$/)
    .required()
    .description("Telegram Bot API token"),

  BOT_WEBHOOK_URL: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .description("Bot webhook URL"),

  BOT_WEBHOOK_SECRET: Joi.string()
    .min(16)
    .description("Bot webhook secret token"),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description("JWT secret key (minimum 32 characters)"),

  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default("24h")
    .description("JWT expiration time (e.g., 24h, 7d)"),

  // Rate Limiting Configuration
  RATE_LIMIT_TTL: Joi.number()
    .integer()
    .min(1)
    .max(3600)
    .default(60)
    .description("Rate limit time window in seconds"),

  RATE_LIMIT_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100)
    .description("Rate limit maximum requests per window"),

  // Security Configuration
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(15)
    .default(12)
    .description("Bcrypt hash rounds"),

  CORS_ORIGIN: Joi.string()
    .uri()
    .default("http://localhost:3001")
    .description("CORS allowed origin"),

  // Admin Configuration
  ADMIN_TELEGRAM_IDS: Joi.string()
    .pattern(/^\d+(,\d+)*$/)
    .required()
    .description("Comma-separated admin Telegram IDs"),

  SUPER_ADMIN_ID: Joi.number()
    .integer()
    .positive()
    .required()
    .description("Super admin Telegram ID"),

  // Tournament Configuration
  MAX_CONCURRENT_TOURNAMENTS: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(50)
    .description("Maximum concurrent tournaments"),

  DEFAULT_TOURNAMENT_TIMEOUT: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(300)
    .description("Default tournament timeout in seconds"),

  MAX_PLAYERS_PER_TOURNAMENT: Joi.number()
    .valid(64)
    .default(64)
    .description("Maximum players per tournament"),

  MIN_PLAYERS_PER_TOURNAMENT: Joi.number()
    .valid(4)
    .default(4)
    .description("Minimum players per tournament"),

  // Game Configuration
  GAME_ROUND_TIMEOUT: Joi.number()
    .integer()
    .min(10)
    .max(300)
    .default(30)
    .description("Game round timeout in seconds"),

  MAX_GAME_ROUNDS: Joi.number()
    .integer()
    .valid(3, 5, 7)
    .default(3)
    .description("Maximum rounds per game (best-of-N)"),

  GAME_MOVE_TIMEOUT: Joi.number()
    .integer()
    .min(5)
    .max(120)
    .default(30)
    .description("Player move timeout in seconds"),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug", "verbose")
    .default("info")
    .description("Application log level"),

  LOG_FORMAT: Joi.string()
    .valid("json", "simple", "combined")
    .default("json")
    .description("Log output format"),

  // Monitoring Configuration
  PROMETHEUS_METRICS_ENABLED: Joi.boolean()
    .default(true)
    .description("Enable Prometheus metrics collection"),

  PROMETHEUS_METRICS_PORT: Joi.number()
    .port()
    .default(9090)
    .description("Prometheus metrics server port"),

  HEALTH_CHECK_ENABLED: Joi.boolean()
    .default(true)
    .description("Enable health check endpoints"),

  // Bull Queue Configuration
  BULL_REDIS_HOST: Joi.string()
    .hostname()
    .default("localhost")
    .description("Bull queue Redis host"),

  BULL_REDIS_PORT: Joi.number()
    .port()
    .default(6379)
    .description("Bull queue Redis port"),

  BULL_REDIS_PASSWORD: Joi.string()
    .allow("")
    .description("Bull queue Redis password (optional)"),
});

/**
 * Configuration interface for type safety
 *
 * @description TypeScript interface derived from Joi schema to provide
 * type safety when accessing configuration values throughout the application
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private configService: ConfigService<ConfigInterface>) {}
 *
 *   getDbUrl(): string {
 *     return this.configService.get('DATABASE_URL'); // Type-safe access
 *   }
 * }
 * ```
 */
export interface ConfigInterface {
  // Application
  NODE_ENV: "development" | "production" | "test" | "staging";
  PORT: number;
  APP_NAME: string;
  APP_VERSION: string;

  // Database
  DATABASE_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;

  // Redis
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // Telegram Bot
  BOT_TOKEN: string;
  BOT_WEBHOOK_URL?: string;
  BOT_WEBHOOK_SECRET?: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Rate Limiting
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_LIMIT: number;

  // Security
  BCRYPT_ROUNDS: number;
  CORS_ORIGIN: string;

  // Admin
  ADMIN_TELEGRAM_IDS: string;
  SUPER_ADMIN_ID: number;

  // Tournament
  MAX_CONCURRENT_TOURNAMENTS: number;
  DEFAULT_TOURNAMENT_TIMEOUT: number;
  MAX_PLAYERS_PER_TOURNAMENT: number;
  MIN_PLAYERS_PER_TOURNAMENT: number;

  // Game
  GAME_ROUND_TIMEOUT: number;
  MAX_GAME_ROUNDS: number;
  GAME_MOVE_TIMEOUT: number;

  // Logging
  LOG_LEVEL: "error" | "warn" | "info" | "debug" | "verbose";
  LOG_FORMAT: "json" | "simple" | "combined";

  // Monitoring
  PROMETHEUS_METRICS_ENABLED: boolean;
  PROMETHEUS_METRICS_PORT: number;
  HEALTH_CHECK_ENABLED: boolean;

  // Bull Queue
  BULL_REDIS_HOST: string;
  BULL_REDIS_PORT: number;
  BULL_REDIS_PASSWORD?: string;
}
