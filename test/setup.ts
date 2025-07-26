import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Global test configuration
jest.setTimeout(30000);

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Uncomment to suppress logs during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
  };
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidDate(): R;
      toMatchTelegramMessage(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
  
  toMatchTelegramMessage(received: any) {
    const pass = typeof received === 'object' && 
                 received !== null && 
                 typeof received.text === 'string' &&
                 typeof received.chat === 'object';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to match Telegram message format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to match Telegram message format`,
        pass: false,
      };
    }
  },
});

// Global test helpers
export class TestHelpers {
  static async createTestingModule(imports: any[], providers: any[] = []) {
    return Test.createTestingModule({
      imports,
      providers,
    }).compile();
  }
  
  static createMockRepository<T = any>(): Partial<Repository<T>> {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
      manager: {
        transaction: jest.fn(),
      } as any,
    };
  }
  
  static getMockRepositoryToken(entity: any) {
    return getRepositoryToken(entity);
  }
  
  static async cleanupTestApp(app: INestApplication) {
    if (app) {
      await app.close();
    }
  }
}

// Global test data
export const TEST_USER_ID = 123456789;
export const TEST_USERNAME = 'testuser';
export const TEST_CHAT_ID = 987654321;

// Global mock functions
export const mockTelegramContext = {
  message: {
    message_id: 1,
    from: {
      id: TEST_USER_ID,
      username: TEST_USERNAME,
      first_name: 'Test',
      is_bot: false,
    },
    chat: {
      id: TEST_CHAT_ID,
      type: 'private' as const,
    },
    date: Math.floor(Date.now() / 1000),
    text: '/start',
  },
  reply: jest.fn(),
  replyWithMarkdown: jest.fn(),
  replyWithHTML: jest.fn(),
  editMessageText: jest.fn(),
  deleteMessage: jest.fn(),
  answerCallbackQuery: jest.fn(),
  telegram: {
    sendMessage: jest.fn(),
    editMessageText: jest.fn(),
    deleteMessage: jest.fn(),
  },
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Perform global cleanup if needed
});