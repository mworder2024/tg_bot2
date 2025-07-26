import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';

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

    // Global validation pipe with transformation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Less strict for MVP
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
      origin: '*', // Allow all origins for MVP
      credentials: true,
    });

    // Start the application
    await app.listen(port);
    
    logger.log(`🚀 RPS Tournament Bot API is running on port ${port}`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`📊 Health check: http://localhost:${port}/api/v1/ping`);
    logger.log(`\n⚠️  Note: Running without Telegram bot due to connectivity issues`);
    logger.log(`💡 You can still use:`);
    logger.log(`   - CLI interface: npm run cli`);
    logger.log(`   - REST API: http://localhost:${port}/api/v1`);

  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();