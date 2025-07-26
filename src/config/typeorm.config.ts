import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { Game } from '../entities/game.entity';

// Load environment variables
config();

const configService = new ConfigService();
const isProduction = configService.get('NODE_ENV') === 'production';
const databaseUrl = configService.get('DATABASE_URL');

const dataSourceConfig = isProduction && databaseUrl
  ? {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      entities: [User, UserStats, Game],
      migrations: ['dist/migrations/*.js'],
      synchronize: false,
      logging: false,
    }
  : {
      type: 'sqlite' as const,
      database: './data/gamebot.db',
      entities: [User, UserStats, Game],
      migrations: ['dist/migrations/*.js'],
      synchronize: false,
      logging: false,
    };

export default new DataSource(dataSourceConfig);