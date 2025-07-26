import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/modules/app/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// Global test application instance
let testApp: INestApplication;
let testDataSource: DataSource;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
  .overrideProvider(ConfigService)
  .useValue({
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        DATABASE_TYPE: 'sqlite',
        DATABASE_DATABASE: ':memory:',
        DATABASE_SYNCHRONIZE: true,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        BOT_TOKEN: 'test-bot-token',
        JWT_SECRET: 'test-jwt-secret',
        NODE_ENV: 'test',
        PORT: 3001,
        RATE_LIMIT_TTL: 60,
        RATE_LIMIT_LIMIT: 1000, // Higher limit for e2e tests
      };
      return config[key] || defaultValue;
    }),
  })
  .compile();

  testApp = moduleFixture.createNestApplication();
  
  // Configure test app
  testApp.setGlobalPrefix('api/v1');
  
  await testApp.init();
  
  // Get database connection for cleanup
  testDataSource = testApp.get(DataSource);
}, 30000);

afterAll(async () => {
  if (testApp) {
    await testApp.close();
  }
  if (testDataSource) {
    await testDataSource.destroy();
  }
}, 30000);

beforeEach(async () => {
  // Clean database before each test
  if (testDataSource) {
    const entities = testDataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.clear();
    }
  }
}, 10000);

// E2E test utilities
export const e2eTestUtils = {
  getApp: () => testApp,
  getDataSource: () => testDataSource,
  
  cleanDatabase: async () => {
    const entities = testDataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.clear();
    }
  },
  
  seedTestData: async (data: Record<string, any[]>) => {
    for (const [entityName, records] of Object.entries(data)) {
      const repository = testDataSource.getRepository(entityName);
      await repository.save(records);
    }
  },
  
  createAuthenticatedRequest: (userId: string) => {
    // Mock authentication for E2E tests
    return {
      headers: {
        authorization: `Bearer mock-token-${userId}`,
      },
    };
  },
};

// Mock Telegram bot for E2E tests
export class MockTelegramBot {
  private messages: any[] = [];
  private callbacks: any[] = [];
  
  async sendMessage(chatId: number, text: string, options?: any) {
    const message = {
      message_id: this.messages.length + 1,
      chat: { id: chatId },
      text,
      options,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    return message;
  }
  
  async editMessage(chatId: number, messageId: number, text: string, options?: any) {
    const messageIndex = this.messages.findIndex(m => 
      m.chat.id === chatId && m.message_id === messageId
    );
    
    if (messageIndex >= 0) {
      this.messages[messageIndex] = {
        ...this.messages[messageIndex],
        text,
        options,
        edited: true,
        timestamp: Date.now(),
      };
      return this.messages[messageIndex];
    }
    return null;
  }
  
  async answerCallbackQuery(callbackQueryId: string, options?: any) {
    this.callbacks.push({
      id: callbackQueryId,
      options,
      timestamp: Date.now(),
    });
    return true;
  }
  
  getMessages() {
    return [...this.messages];
  }
  
  getCallbacks() {
    return [...this.callbacks];
  }
  
  clearHistory() {
    this.messages = [];
    this.callbacks = [];
  }
}

// Global utilities for E2E tests  
global.e2eTestUtils = e2eTestUtils;
global.MockTelegramBot = MockTelegramBot;