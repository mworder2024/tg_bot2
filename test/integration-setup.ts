import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// Test database configuration
export const getTestDatabaseConfig = () => ({
  type: 'sqlite' as const,
  database: ':memory:',
  entities: ['src/**/*.entity.ts'],
  synchronize: true,
  logging: false,
  dropSchema: true,
});

// Global test database connection
let testDataSource: DataSource;

beforeAll(async () => {
  testDataSource = new DataSource(getTestDatabaseConfig());
  await testDataSource.initialize();
});

afterAll(async () => {
  if (testDataSource) {
    await testDataSource.destroy();
  }
});

beforeEach(async () => {
  // Clean all tables before each test
  const entities = testDataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.clear();
  }
});

// Test utilities for integration tests
export const integrationTestUtils = {
  getDataSource: () => testDataSource,
  
  cleanDatabase: async () => {
    const entities = testDataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.clear();
    }
  },
  
  seedDatabase: async (data: Record<string, any[]>) => {
    for (const [entityName, records] of Object.entries(data)) {
      const repository = testDataSource.getRepository(entityName);
      await repository.save(records);
    }
  },
};

// Mock configuration for integration tests
export const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config = {
      DATABASE_TYPE: 'sqlite',
      DATABASE_DATABASE: ':memory:',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      BOT_TOKEN: 'test-bot-token',
      JWT_SECRET: 'test-jwt-secret',
      NODE_ENV: 'test',
    };
    return config[key] || defaultValue;
  }),
};

// Global setup for integration tests
global.integrationTestUtils = integrationTestUtils;
global.mockConfigService = mockConfigService;