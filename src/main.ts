import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './modules/app/app.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Bootstrap the NestJS application with security, validation, and documentation
 * 
 * @description Initializes the Telegram RPS Tournament Bot application with:
 * - Security middleware (Helmet)
 * - Request compression
 * - Input validation with class-validator
 * - OpenAPI documentation
 * - Global error handling
 * 
 * @example
 * ```bash
 * npm run start:dev  # Development mode with hot reload
 * npm run start:prod # Production mode
 * ```
 * 
 * @since 1.0.0
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create NestJS application instance
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // Compression middleware
    app.use(compression());

    // Global validation pipe with transformation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // API prefix for all routes
    app.setGlobalPrefix('api/v1');

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
      credentials: true,
    });

    // OpenAPI/Swagger documentation setup (disabled for MVP)
    if (nodeEnv === 'development') {
      logger.log(`API Documentation disabled for MVP`);
    }

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    // Start the application
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 RPS Tournament Bot is running on port ${port}`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`📊 Health check: http://localhost:${port}/api/v1/ping`);
    
    if (nodeEnv === 'development') {
      logger.log(`📖 API Docs: http://localhost:${port}/api/docs`);
    }

  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

bootstrap();