import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../src/entities/user.entity';
import { Game } from '../../src/entities/game.entity';
import { UserStats } from '../../src/entities/user-stats.entity';

/**
 * Database testing utilities
 */
export class DatabaseTestHelper {
  private static dataSource: DataSource;

  /**
   * Create an in-memory SQLite database for testing
   */
  static async createTestDatabase(): Promise<DataSource> {
    if (this.dataSource) {
      return this.dataSource;
    }

    this.dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Game, UserStats],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });

    await this.dataSource.initialize();
    return this.dataSource;
  }

  /**
   * Get TypeORM testing module configuration
   */
  static getTypeOrmTestingModule() {
    return TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Game, UserStats],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
  }

  /**
   * Create a test module with database
   */
  static async createTestingModule(providers: any[] = [], imports: any[] = []): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        this.getTypeOrmTestingModule(),
        TypeOrmModule.forFeature([User, Game, UserStats]),
        ...imports,
      ],
      providers,
    }).compile();
  }

  /**
   * Clear all data from test database
   */
  static async clearDatabase(): Promise<void> {
    if (!this.dataSource) return;

    const entities = this.dataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Close the test database connection
   */
  static async closeDatabase(): Promise<void> {
    if (this.dataSource) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
  }

  /**
   * Seed test database with sample data
   */
  static async seedDatabase(): Promise<{
    users: User[];
    games: Game[];
  }> {
    // Implementation would go here
    return { users: [], games: [] };
  }
}