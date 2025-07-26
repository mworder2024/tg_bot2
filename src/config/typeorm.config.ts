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

export default new DataSource({
  type: isProduction && databaseUrl ? 'postgres' : 'sqlite',
  ...(isProduction && databaseUrl
    ? {
        url: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        database: './data/gamebot.db',
      }),
  entities: [User, UserStats, Game],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: false,
});