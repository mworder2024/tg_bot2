import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityTarget } from 'typeorm';
import { INestApplication } from '@nestjs/common';

/**
 * Test database configuration and utilities
 */
export class TestDatabase {
  private static connections: Map<string, DataSource> = new Map();

  /**
   * Create an in-memory SQLite database for testing
   */
  static createTestDatabase(entities: any[] = []): any {
    return TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities,
      synchronize: true,
      dropSchema: true,
      logging: false,
    });
  }

  /**
   * Create a PostgreSQL test database
   */
  static createPostgresTestDatabase(entities: any[] = []): any {
    const dbName = `test_db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: dbName,
      entities,
      synchronize: true,
      dropSchema: true,
      logging: false,
    });
  }

  /**
   * Create test application with database
   */
  static async createTestApp(
    imports: any[] = [],
    entities: any[] = [],
    usePostgres: boolean = false
  ): Promise<INestApplication> {
    const databaseModule = usePostgres 
      ? this.createPostgresTestDatabase(entities)
      : this.createTestDatabase(entities);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [databaseModule, ...imports],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    return app;
  }

  /**
   * Get repository from test application
   */
  static getRepository<T>(app: INestApplication, entity: EntityTarget<T>): Repository<T> {
    return app.get<Repository<T>>(getRepositoryToken(entity));
  }

  /**
   * Clean all data from repositories
   */
  static async cleanDatabase(app: INestApplication, entities: any[]): Promise<void> {
    const dataSource = app.get(DataSource);
    
    // Disable foreign key constraints for cleanup
    if (dataSource.options.type === 'sqlite') {
      await dataSource.query('PRAGMA foreign_keys = OFF');
    }

    // Clear all tables
    for (const entity of entities) {
      const repository = this.getRepository(app, entity);
      await repository.clear();
    }

    // Re-enable foreign key constraints
    if (dataSource.options.type === 'sqlite') {
      await dataSource.query('PRAGMA foreign_keys = ON');
    }
  }

  /**
   * Seed database with test data
   */
  static async seedDatabase(
    app: INestApplication,
    seedData: { entity: any; data: any[] }[]
  ): Promise<void> {
    for (const { entity, data } of seedData) {
      const repository = this.getRepository(app, entity);
      await repository.save(data);
    }
  }

  /**
   * Execute raw SQL query
   */
  static async executeQuery(app: INestApplication, query: string, parameters?: any[]): Promise<any> {
    const dataSource = app.get(DataSource);
    return dataSource.query(query, parameters);
  }

  /**
   * Start database transaction for testing
   */
  static async startTransaction(app: INestApplication): Promise<any> {
    const dataSource = app.get(DataSource);
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  /**
   * Rollback transaction
   */
  static async rollbackTransaction(queryRunner: any): Promise<void> {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }

  /**
   * Create database backup for restoration
   */
  static async createBackup(app: INestApplication, entities: any[]): Promise<Map<any, any[]>> {
    const backup = new Map();
    
    for (const entity of entities) {
      const repository = this.getRepository(app, entity);
      const data = await repository.find();
      backup.set(entity, data);
    }
    
    return backup;
  }

  /**
   * Restore database from backup
   */
  static async restoreFromBackup(
    app: INestApplication,
    backup: Map<any, any[]>
  ): Promise<void> {
    // First clean the database
    await this.cleanDatabase(app, Array.from(backup.keys()));

    // Then restore data
    for (const [entity, data] of backup.entries()) {
      const repository = this.getRepository(app, entity);
      await repository.save(data);
    }
  }

  /**
   * Wait for database to be ready
   */
  static async waitForDatabase(app: INestApplication, timeout: number = 10000): Promise<void> {
    const dataSource = app.get(DataSource);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await dataSource.query('SELECT 1');
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw new Error(`Database not ready after ${timeout}ms`);
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(app: INestApplication, entities: any[]): Promise<any> {
    const stats: any = {};
    
    for (const entity of entities) {
      const repository = this.getRepository(app, entity);
      const count = await repository.count();
      stats[entity.name] = count;
    }
    
    return stats;
  }

  /**
   * Cleanup database connections
   */
  static async cleanup(): Promise<void> {
    for (const [name, connection] of this.connections) {
      if (connection.isInitialized) {
        await connection.destroy();
      }
    }
    this.connections.clear();
  }
}

/**
 * Database test utilities for specific scenarios
 */
export class DatabaseTestScenarios {
  /**
   * Test database constraints
   */
  static async testUniqueConstraint(
    app: INestApplication,
    entity: any,
    data: any,
    constraintField: string
  ): Promise<boolean> {
    const repository = TestDatabase.getRepository(app, entity);
    
    try {
      await repository.save(data);
      await repository.save(data); // This should fail
      return false;
    } catch (error) {
      return error.message.includes(constraintField);
    }
  }

  /**
   * Test foreign key constraints
   */
  static async testForeignKeyConstraint(
    app: INestApplication,
    entity: any,
    data: any
  ): Promise<boolean> {
    const repository = TestDatabase.getRepository(app, entity);
    
    try {
      await repository.save(data);
      return false;
    } catch (error) {
      return error.message.includes('foreign key');
    }
  }

  /**
   * Test cascading deletes
   */
  static async testCascadingDelete(
    app: INestApplication,
    parentEntity: any,
    childEntity: any,
    parentData: any,
    childData: any
  ): Promise<boolean> {
    const parentRepo = TestDatabase.getRepository(app, parentEntity);
    const childRepo = TestDatabase.getRepository(app, childEntity);
    
    // Save parent and child
    const savedParent = await parentRepo.save(parentData);
    childData.parentId = savedParent.id;
    await childRepo.save(childData);
    
    // Delete parent
    await parentRepo.remove(savedParent);
    
    // Check if child was also deleted
    const remainingChildren = await childRepo.find({ where: { parentId: savedParent.id } });
    return remainingChildren.length === 0;
  }
}

/**
 * Mock repository factory for unit tests
 */
export function createMockRepository<T = any>(): Partial<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
    manager: {
      transaction: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
    } as any,
  };
}

/**
 * Helper for creating test module with mock repositories
 */
export function createTestModuleWithMockDb(
  providers: any[] = [],
  entities: any[] = []
): any {
  const mockProviders = entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useFactory: createMockRepository,
  }));

  return Test.createTestingModule({
    providers: [...providers, ...mockProviders],
  });
}

/**
 * Example usage:
 * 
 * describe('PlayerService Integration', () => {
 *   let app: INestApplication;
 *   let playerRepository: Repository<Player>;
 * 
 *   beforeAll(async () => {
 *     app = await TestDatabase.createTestApp([PlayerModule], [Player]);
 *     playerRepository = TestDatabase.getRepository(app, Player);
 *   });
 * 
 *   afterAll(async () => {
 *     await app.close();
 *   });
 * 
 *   beforeEach(async () => {
 *     await TestDatabase.cleanDatabase(app, [Player]);
 *   });
 * 
 *   it('should save and retrieve player', async () => {
 *     const playerData = TestDataFactory.createPlayer();
 *     const saved = await playerRepository.save(playerData);
 *     const found = await playerRepository.findOneBy({ id: saved.id });
 *     
 *     expect(found).toEqual(saved);
 *   });
 * });
 */