import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { UserStats } from '../../entities/user-stats.entity';
import { Game } from '../../entities/game.entity';
// import { Tournament } from '../../entities/tournament.entity';
// import { TournamentMatch } from '../../entities/tournament-match.entity';
// import { TournamentParticipant } from '../../entities/tournament-participant.entity';

/**
 * Database module with SQLite configuration for MVP
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const databaseUrl = configService.get('DATABASE_URL');
        
        // Railway provides DATABASE_URL for PostgreSQL
        if (isProduction && databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, UserStats, Game],
            synchronize: false, // Never use synchronize in production
            logging: configService.get('DB_LOGGING', false),
            autoLoadEntities: true,
            ssl: {
              rejectUnauthorized: false, // Railway PostgreSQL requires this
            },
          };
        }
        
        // Development/local configuration (SQLite)
        return {
          type: 'sqlite',
          database: configService.get('DB_DATABASE', './data/gamebot.db'),
          entities: [User, UserStats, Game],
          synchronize: configService.get('DB_SYNCHRONIZE', true),
          logging: configService.get('DB_LOGGING', false),
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}