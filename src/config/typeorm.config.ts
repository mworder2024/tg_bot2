import { DataSource, DataSourceOptions } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { config } from "dotenv";
import { User } from "../entities/user.entity";
import { UserStats } from "../entities/user-stats.entity";
import { Game } from "../entities/game.entity";

// Load environment variables for database configuration
config();

const configService = new ConfigService();
const isProduction = configService.get("NODE_ENV") === "production";
const databaseUrl = configService.get("DATABASE_URL");

const postgresConfig: DataSourceOptions = {
  type: "postgres",
  url: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [User, UserStats, Game],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
  logging: false,
};

const sqliteConfig: DataSourceOptions = {
  type: "sqlite",
  database: "./data/gamebot.db",
  entities: [User, UserStats, Game],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
  logging: false,
};

export default new DataSource(
  isProduction && databaseUrl ? postgresConfig : sqliteConfig,
);
