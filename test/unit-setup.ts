import 'reflect-metadata';

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console logs during tests
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
  
  // Keep console.info for important test output
  console.info = originalConsole.info;
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});
// Mock NestJS Logger globally
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  })),
}));

// Configure Jest environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';