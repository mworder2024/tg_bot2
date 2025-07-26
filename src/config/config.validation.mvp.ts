import * as Joi from 'joi';

/**
 * MVP Environment configuration validation schema
 * 
 * @description Simplified Joi schema for MVP with minimal requirements
 */
export const configValidation = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
    
  PORT: Joi.number()
    .port()
    .default(3000),

  // Database Configuration (SQLite for MVP)
  DB_TYPE: Joi.string()
    .default('sqlite'),
    
  DB_DATABASE: Joi.string()
    .default('./data/gamebot.db'),

  // Telegram Bot Configuration (optional for MVP)
  BOT_TOKEN: Joi.string()
    .default('your_bot_token_here')
    .description('Telegram Bot API token (optional for MVP)'),

  // Rate Limiting Configuration
  RATE_LIMIT_TTL: Joi.number()
    .integer()
    .min(1)
    .max(3600)
    .default(60),
    
  RATE_LIMIT_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100),

  // Security Configuration
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3001'),

  // Game Configuration
  GAME_ROUND_TIMEOUT: Joi.number()
    .integer()
    .min(10)
    .max(300)
    .default(30),
    
  MAX_GAME_ROUNDS: Joi.number()
    .integer()
    .valid(3, 5, 7)
    .default(3),
    
  GAME_MOVE_TIMEOUT: Joi.number()
    .integer()
    .min(5)
    .max(120)
    .default(30),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});

/**
 * MVP Configuration interface
 */
export interface ConfigInterface {
  NODE_ENV: 'development' | 'production' | 'test' | 'staging';
  PORT: number;
  DB_TYPE: string;
  DB_DATABASE: string;
  BOT_TOKEN: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_LIMIT: number;
  CORS_ORIGIN: string;
  GAME_ROUND_TIMEOUT: number;
  MAX_GAME_ROUNDS: number;
  GAME_MOVE_TIMEOUT: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
}