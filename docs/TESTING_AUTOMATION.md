# Testing Automation Framework

## Overview
This document outlines the comprehensive testing automation framework for the Telegram RPS Tournament Bot, ensuring high-quality, reliable, and performant software delivery.

## Testing Architecture

### Testing Pyramid Implementation

```
     E2E Tests (10% - 50 tests)
   ┌─────────────────────────────┐
   │ Integration Tests (20% - 200 tests) │
 ┌─────────────────────────────────────────┐  
 │        Unit Tests (70% - 700 tests)         │
 └─────────────────────────────────────────────┘
```

## Unit Testing Framework

### Configuration (jest.config.js)
```javascript
module.exports = {
  preset: '@nestjs/testing',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
  ],
  testTimeout: 10000,
  maxWorkers: '50%',
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/unit-setup.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
      testTimeout: 30000,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
      testTimeout: 60000,
    },
  ],
};
```

### Unit Test Structure

#### Service Testing Template
```typescript
// src/game/services/game.service.spec.ts
describe('GameService', () => {
  let service: GameService;
  let mockRepository: MockType<Repository<Game>>;
  let mockRedisService: MockType<RedisService>;
  let mockEventEmitter: MockType<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: getRepositoryToken(Game),
          useFactory: repositoryMockFactory,
        },
        {
          provide: RedisService,
          useFactory: mockServiceFactory,
        },
        {
          provide: EventEmitter2,
          useFactory: mockServiceFactory,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    mockRepository = module.get(getRepositoryToken(Game));
    mockRedisService = module.get(RedisService);
    mockEventEmitter = module.get(EventEmitter2);
  });

  describe('createGame', () => {
    it('should create a new game with valid players', async () => {
      // Arrange
      const createGameDto = createMockCreateGameDto();
      const expectedGame = createMockGame();
      mockRepository.save.mockResolvedValue(expectedGame);

      // Act
      const result = await service.createGame(createGameDto);

      // Assert
      expect(result).toEqual(expectedGame);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          player1Id: createGameDto.player1Id,
          player2Id: createGameDto.player2Id,
          status: GameStatus.WAITING,
        })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'game.created',
        expect.any(Object)
      );
    });

    it('should throw BadRequestException for invalid player IDs', async () => {
      // Arrange
      const invalidDto = { player1Id: 'invalid', player2Id: 'invalid' };

      // Act & Assert
      await expect(service.createGame(invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dto = createMockCreateGameDto();
      mockRepository.save.mockRejectedValue(new Error('DB Connection lost'));

      // Act & Assert
      await expect(service.createGame(dto)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('processMove', () => {
    it('should process valid move and determine winner', async () => {
      // Arrange
      const gameId = 'game-123';
      const playerId = 'player-1';
      const move = RPSMove.ROCK;
      const gameState = createMockGameState();
      
      mockRedisService.get.mockResolvedValue(JSON.stringify(gameState));
      mockRepository.findOne.mockResolvedValue(createMockGame());

      // Act
      const result = await service.processMove(gameId, playerId, move);

      // Assert
      expect(result).toBeDefined();
      expect(result.move).toBe(move);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      const expiredGameState = createMockExpiredGameState();
      mockRedisService.get.mockResolvedValue(JSON.stringify(expiredGameState));

      // Act
      const result = await service.processMove('game-123', 'player-1', RPSMove.ROCK);

      // Assert
      expect(result.status).toBe(GameStatus.TIMEOUT);
    });
  });
});
```

#### Controller Testing Template
```typescript
// src/game/controllers/game.controller.spec.ts
describe('GameController', () => {
  let controller: GameController;
  let service: MockType<GameService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useFactory: mockServiceFactory,
        },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
    service = module.get(GameService);
  });

  describe('POST /games', () => {
    it('should create a new game', async () => {
      // Arrange
      const createGameDto = createMockCreateGameDto();
      const expectedGame = createMockGame();
      service.createGame.mockResolvedValue(expectedGame);

      // Act
      const result = await controller.createGame(createGameDto);

      // Assert
      expect(result).toEqual(expectedGame);
      expect(service.createGame).toHaveBeenCalledWith(createGameDto);
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidDto = { player1Id: '', player2Id: '' };
      service.createGame.mockRejectedValue(new BadRequestException());

      // Act & Assert
      await expect(controller.createGame(invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
```

### Test Data Factories

#### Mock Data Factory
```typescript
// test/factories/test-data-factory.ts
export class TestDataFactory {
  static createMockUser(overrides?: Partial<User>): User {
    return {
      id: faker.datatype.uuid(),
      telegramId: faker.datatype.number({ min: 100000000, max: 999999999 }),
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMockGame(overrides?: Partial<Game>): Game {
    return {
      id: faker.datatype.uuid(),
      player1: this.createMockUser(),
      player2: this.createMockUser(),
      status: GameStatus.WAITING,
      gameType: GameType.QUICK,
      roundsToWin: 1,
      currentRound: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMockTournament(overrides?: Partial<Tournament>): Tournament {
    return {
      id: faker.datatype.uuid(),
      name: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      maxParticipants: 8,
      currentParticipants: 0,
      status: TournamentStatus.REGISTRATION,
      tournamentType: TournamentType.SINGLE_ELIMINATION,
      createdBy: this.createMockUser(),
      startTime: faker.date.future(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMockGameState(): GameStateCache {
    return {
      gameId: faker.datatype.uuid(),
      status: 'active',
      players: {
        player1: { id: faker.datatype.uuid(), ready: true },
        player2: { id: faker.datatype.uuid(), ready: true },
      },
      currentRound: 1,
      rounds: [],
      timeoutAt: new Date(Date.now() + 30000),
    };
  }
}
```

## Integration Testing Framework

### Database Integration Tests
```typescript
// test/integration/game.integration.spec.ts
describe('Game Integration Tests', () => {
  let app: INestApplication;
  let gameService: GameService;
  let userService: UserService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => testConfig],
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        GameModule,
        UserModule,
        RedisModule.forRoot(testRedisConfig),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gameService = moduleFixture.get<GameService>(GameService);
    userService = moduleFixture.get<UserService>(UserService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Game Lifecycle', () => {
    it('should complete full game lifecycle', async () => {
      // Arrange - Create users
      const player1 = await userService.create({
        telegramId: 123456789,
        username: 'player1',
        firstName: 'Player',
        lastName: 'One',
      });

      const player2 = await userService.create({
        telegramId: 987654321,
        username: 'player2',
        firstName: 'Player',
        lastName: 'Two',
      });

      // Act - Create game
      const game = await gameService.createGame({
        player1Id: player1.id,
        player2Id: player2.id,
        gameType: GameType.QUICK,
        roundsToWin: 1,
      });

      // Make moves
      const move1Result = await gameService.processMove(
        game.id,
        player1.id,
        RPSMove.ROCK
      );

      const move2Result = await gameService.processMove(
        game.id,
        player2.id,
        RPSMove.SCISSORS
      );

      // Assert
      expect(game).toBeDefined();
      expect(game.status).toBe(GameStatus.WAITING);
      expect(move2Result.winner).toBe(player1.id);
      expect(move2Result.status).toBe(GameStatus.COMPLETED);

      // Verify database state
      const updatedGame = await gameService.findById(game.id);
      expect(updatedGame.status).toBe(GameStatus.COMPLETED);
      expect(updatedGame.winner?.id).toBe(player1.id);
    });

    it('should handle concurrent game operations', async () => {
      // Test concurrent game creation and moves
      const users = await Promise.all([
        userService.create(createMockCreateUserDto()),
        userService.create(createMockCreateUserDto()),
        userService.create(createMockCreateUserDto()),
        userService.create(createMockCreateUserDto()),
      ]);

      // Create multiple games concurrently
      const gamePromises = [
        gameService.createGame({
          player1Id: users[0].id,
          player2Id: users[1].id,
          gameType: GameType.QUICK,
        }),
        gameService.createGame({
          player1Id: users[2].id,
          player2Id: users[3].id,
          gameType: GameType.QUICK,
        }),
      ];

      const games = await Promise.all(gamePromises);

      expect(games).toHaveLength(2);
      expect(games[0].id).not.toBe(games[1].id);
    });
  });
});
```

### Telegram Bot Integration Tests
```typescript
// test/integration/telegram-bot.integration.spec.ts
describe('Telegram Bot Integration', () => {
  let app: INestApplication;
  let botService: TelegramBotService;
  let mockTelegraf: MockTelegraf;

  beforeAll(async () => {
    mockTelegraf = new MockTelegraf();
    
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        {
          provide: Telegraf,
          useValue: mockTelegraf,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    botService = moduleFixture.get<TelegramBotService>(TelegramBotService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Command Handling', () => {
    it('should handle /start command', async () => {
      // Arrange
      const mockCtx = createMockTelegramContext({
        message: { text: '/start' },
        from: { id: 123456789, username: 'testuser' },
      });

      // Act
      await botService.handleStart(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to RPS Tournament Bot!')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          reply_markup: expect.any(Object),
        })
      );
    });

    it('should handle /play command', async () => {
      // Arrange
      const mockCtx = createMockTelegramContext({
        message: { text: '/play' },
        from: { id: 123456789, username: 'testuser' },
      });

      // Act
      await botService.handlePlay(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Looking for an opponent...')
      );
    });

    it('should handle tournament registration', async () => {
      // Arrange
      const mockCtx = createMockTelegramContext({
        message: { text: '/tournament' },
        from: { id: 123456789, username: 'testuser' },
      });

      // Act
      await botService.handleTournament(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Tournament Options'),
          reply_markup: expect.any(Object),
        })
      );
    });
  });

  describe('Game Flow Integration', () => {
    it('should complete game flow through bot commands', async () => {
      // Create two mock users
      const player1Ctx = createMockTelegramContext({
        from: { id: 111, username: 'player1' },
      });
      const player2Ctx = createMockTelegramContext({
        from: { id: 222, username: 'player2' },
      });

      // Player 1 starts game
      await botService.handlePlay(player1Ctx);
      
      // Player 2 joins game
      await botService.handlePlay(player2Ctx);

      // Both players should receive game start message
      expect(player1Ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Game started!')
      );
      expect(player2Ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Game started!')
      );
    });
  });
});
```

## End-to-End Testing Framework

### E2E Test Setup
```typescript
// test/e2e/tournament.e2e-spec.ts
describe('Tournament E2E Tests', () => {
  let app: INestApplication;
  let telegramClient: MockTelegramClient;
  let databaseHelper: DatabaseHelper;

  beforeAll(async () => {
    // Setup test application
    app = await createE2ETestApp();
    
    // Setup mock Telegram client
    telegramClient = new MockTelegramClient();
    
    // Setup database helper
    databaseHelper = new DatabaseHelper(app);
  });

  beforeEach(async () => {
    await databaseHelper.cleanDatabase();
    await databaseHelper.seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Tournament Flow', () => {
    it('should run full 8-player tournament', async () => {
      // Create tournament
      const tournament = await telegramClient.sendCommand(
        '/create_tournament 8 "Test Tournament"',
        { userId: ADMIN_USER_ID }
      );

      expect(tournament.response).toContain('Tournament created');

      // Register 8 players
      const players = [];
      for (let i = 1; i <= 8; i++) {
        const player = await telegramClient.sendCommand('/join', {
          userId: 1000 + i,
          username: `player${i}`,
        });
        players.push(player);
      }

      // Verify tournament is full
      const tournamentStatus = await telegramClient.sendCommand(
        '/tournament_status',
        { userId: ADMIN_USER_ID }
      );
      expect(tournamentStatus.response).toContain('8/8 players');

      // Start tournament
      await telegramClient.sendCommand('/start_tournament', {
        userId: ADMIN_USER_ID,
      });

      // Simulate all matches
      let round = 1;
      let activePlayers = 8;

      while (activePlayers > 1) {
        console.log(`Simulating round ${round} with ${activePlayers} players`);

        // Get current matches
        const matches = await databaseHelper.getCurrentMatches();
        
        // Play all matches in this round
        for (const match of matches) {
          await simulateMatch(match, telegramClient);
        }

        // Check round completion
        const roundStatus = await telegramClient.sendCommand(
          '/tournament_status'
        );
        
        activePlayers = activePlayers / 2;
        round++;
      }

      // Verify tournament completion
      const finalStatus = await telegramClient.sendCommand(
        '/tournament_status'
      );
      
      expect(finalStatus.response).toContain('Tournament completed');
      expect(finalStatus.response).toContain('Winner:');

      // Verify database state
      const completedTournament = await databaseHelper.getTournament(tournament.id);
      expect(completedTournament.status).toBe(TournamentStatus.COMPLETED);
      expect(completedTournament.winner).toBeDefined();
    });

    it('should handle tournament with player dropouts', async () => {
      // Similar test but with players leaving mid-tournament
      // Test forfeit handling and bracket adjustment
    });

    it('should handle concurrent tournament operations', async () => {
      // Test multiple tournaments running simultaneously
      // Verify no cross-tournament interference
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database disconnection gracefully', async () => {
      // Simulate database failure during tournament
      await databaseHelper.simulateDisconnection();
      
      const response = await telegramClient.sendCommand('/play');
      
      expect(response.response).toContain('Service temporarily unavailable');
    });

    it('should handle Redis cache failure', async () => {
      // Simulate Redis failure
      // Verify graceful degradation
    });
  });
});
```

### Mock Telegram Client
```typescript
// test/utils/mock-telegram-client.ts
export class MockTelegramClient {
  private bot: MockTelegraf;
  private responses: Map<string, any> = new Map();

  constructor() {
    this.bot = new MockTelegraf();
  }

  async sendCommand(
    command: string,
    options: { userId?: number; username?: string } = {}
  ): Promise<{ response: string; messageId: number }> {
    const mockContext = this.createMockContext(command, options);
    
    // Process command through bot
    await this.bot.handleCommand(mockContext);
    
    // Return mock response
    return {
      response: mockContext.getLastReply(),
      messageId: faker.datatype.number(),
    };
  }

  async sendCallback(
    callbackData: string,
    options: { userId?: number } = {}
  ): Promise<any> {
    const mockContext = this.createMockCallbackContext(callbackData, options);
    
    await this.bot.handleCallback(mockContext);
    
    return mockContext.getLastEdit();
  }

  private createMockContext(command: string, options: any): MockTelegramContext {
    return new MockTelegramContext({
      message: {
        text: command,
        from: {
          id: options.userId || 123456789,
          username: options.username || 'testuser',
        },
      },
    });
  }
}
```

## Performance Testing Framework

### Load Testing Configuration
```typescript
// test/performance/load-test.config.ts
export const loadTestConfig = {
  target: process.env.TEST_TARGET || 'http://localhost:3000',
  phases: [
    { duration: '2m', arrivalRate: 10, name: 'Warm up' },
    { duration: '5m', arrivalRate: 50, name: 'Ramp up load' },
    { duration: '10m', arrivalRate: 100, name: 'Sustained load' },
    { duration: '2m', arrivalRate: 200, name: 'Peak load' },
    { duration: '5m', arrivalRate: 50, name: 'Cool down' },
  ],
  plugins: {
    'metrics-by-endpoint': {
      useOnlyRequestNames: true,
    },
    'slack': {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#performance-alerts',
    },
  },
  scenarios: [
    {
      name: 'Game Operations',
      weight: 60,
      flow: [
        {
          post: {
            url: '/api/games',
            json: {
              player1Id: '{{ $randomUUID }}',
              player2Id: '{{ $randomUUID }}',
              gameType: 'QUICK',
            },
          },
          capture: {
            json: '$.id',
            as: 'gameId',
          },
        },
        { think: 1 },
        {
          post: {
            url: '/api/games/{{ gameId }}/moves',
            json: {
              playerId: '{{ player1Id }}',
              move: 'ROCK',
            },
          },
        },
      ],
    },
    {
      name: 'Tournament Operations',
      weight: 40,
      flow: [
        {
          post: {
            url: '/api/tournaments',
            json: {
              name: 'Load Test Tournament {{ $randomString() }}',
              maxParticipants: 8,
              tournamentType: 'SINGLE_ELIMINATION',
            },
          },
          capture: {
            json: '$.id',
            as: 'tournamentId',
          },
        },
        {
          get: {
            url: '/api/tournaments/{{ tournamentId }}',
          },
        },
      ],
    },
  ],
  expect: {
    http: {
      // 95% of requests should respond within 200ms
      p95: 200,
      // 99% of requests should respond within 500ms
      p99: 500,
      // Error rate should be less than 1%
      errors: { rate: 0.01 },
    },
  },
};
```

### Performance Test Implementation
```typescript
// test/performance/game-performance.spec.ts
describe('Game Performance Tests', () => {
  let app: INestApplication;
  let gameService: GameService;

  beforeAll(async () => {
    app = await createPerformanceTestApp();
    gameService = app.get<GameService>(GameService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Throughput Tests', () => {
    it('should handle 100 concurrent game creations', async () => {
      const startTime = Date.now();
      
      const promises = Array(100).fill(0).map(() =>
        gameService.createGame({
          player1Id: faker.datatype.uuid(),
          player2Id: faker.datatype.uuid(),
          gameType: GameType.QUICK,
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.every(game => game.id)).toBe(true);
    });

    it('should process 1000 game moves per second', async () => {
      // Create games first
      const games = await Promise.all(
        Array(500).fill(0).map(() =>
          gameService.createGame({
            player1Id: faker.datatype.uuid(),
            player2Id: faker.datatype.uuid(),
            gameType: GameType.QUICK,
          })
        )
      );

      const startTime = Date.now();
      
      // Process moves
      const movePromises = games.flatMap(game => [
        gameService.processMove(game.id, game.player1.id, RPSMove.ROCK),
        gameService.processMove(game.id, game.player2.id, RPSMove.SCISSORS),
      ]);

      const results = await Promise.all(movePromises);
      const duration = Date.now() - startTime;
      const movesPerSecond = results.length / (duration / 1000);

      expect(movesPerSecond).toBeGreaterThan(1000);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during extended operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 1000 operations
      for (let i = 0; i < 1000; i++) {
        const game = await gameService.createGame({
          player1Id: faker.datatype.uuid(),
          player2Id: faker.datatype.uuid(),
          gameType: GameType.QUICK,
        });

        await gameService.processMove(game.id, game.player1.id, RPSMove.ROCK);
        await gameService.processMove(game.id, game.player2.id, RPSMove.SCISSORS);

        // Cleanup game
        await gameService.deleteGame(game.id);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be less than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
```

## Security Testing Framework

### Security Test Suite
```typescript
// test/security/security.spec.ts
describe('Security Tests', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createSecurityTestApp();
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without valid tokens', async () => {
      await request
        .get('/api/games')
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('Unauthorized');
        });
    });

    it('should validate Telegram authentication data', async () => {
      const invalidTelegramData = {
        id: 'invalid',
        hash: 'tampered-hash',
      };

      await request
        .post('/api/auth/telegram')
        .send(invalidTelegramData)
        .expect(400);
    });

    it('should prevent privilege escalation', async () => {
      const regularUserToken = await getRegularUserToken();
      
      await request
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ adminOnly: true })
        .expect(403);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize SQL injection attempts', async () => {
      const maliciousInput = {
        username: "admin'; DROP TABLE users; --",
      };

      await request
        .post('/api/users')
        .send(maliciousInput)
        .expect(400);

      // Verify users table still exists
      const usersCount = await getUsersCount();
      expect(usersCount).toBeGreaterThan(0);
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = {
        username: '<script>alert("xss")</script>',
      };

      const response = await request
        .post('/api/users')
        .send(xssPayload)
        .expect(400);

      expect(response.body.username).not.toContain('<script>');
    });

    it('should validate input size limits', async () => {
      const oversizedInput = {
        description: 'x'.repeat(10000), // Assuming 1000 char limit
      };

      await request
        .post('/api/tournaments')
        .send(oversizedInput)
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const token = await getValidUserToken();

      // Make requests up to the limit
      const promises = Array(100).fill(0).map(() =>
        request
          .get('/api/games')
          .set('Authorization', `Bearer ${token}`)
      );

      const results = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(res => res.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive user data', async () => {
      const token = await getValidUserToken();

      const response = await request
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('telegramToken');
      expect(response.body).not.toHaveProperty('internalId');
    });

    it('should encrypt sensitive data at rest', async () => {
      // Verify database encryption
      const rawUserData = await getRawUserFromDatabase();
      expect(rawUserData.sensitiveField).toMatch(/^encrypted:/);
    });
  });
});
```

## Test Automation Scripts

### NPM Scripts Enhancement
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=src/.*\\.spec\\.ts$",
    "test:integration": "jest --testPathPattern=test/integration/.*\\.spec\\.ts$",
    "test:e2e": "jest --testPathPattern=test/e2e/.*\\.e2e-spec\\.ts$",
    "test:performance": "jest --testPathPattern=test/performance/.*\\.spec\\.ts$ --detectOpenHandles --forceExit",
    "test:security": "jest --testPathPattern=test/security/.*\\.spec\\.ts$",
    "test:load": "artillery run test/performance/load-test.config.js",
    "test:load:report": "artillery run test/performance/load-test.config.js --output report.json && artillery report report.json",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:ci": "jest --ci --coverage --watchAll=false --maxWorkers=2",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:mutation": "stryker run",
    "test:clean": "rimraf coverage test-results",
    "test:setup": "npm run test:clean && npm run db:test:setup"
  }
}
```

### Test Database Setup Script
```bash
#!/bin/bash
# scripts/setup-test-db.sh

set -e

echo "🗄️ Setting up test database..."

# Create test database
createdb rps_tournament_test || echo "Database already exists"

# Run migrations
NODE_ENV=test npm run db:migrate

# Seed test data
NODE_ENV=test npm run db:seed

echo "✅ Test database setup complete!"
```

### Continuous Testing Script
```bash
#!/bin/bash
# scripts/continuous-test.sh

set -e

echo "🔄 Running continuous test suite..."

# Run tests in order of importance
echo "1️⃣ Running unit tests..."
npm run test:unit

echo "2️⃣ Running integration tests..."
npm run test:integration

echo "3️⃣ Running security tests..."
npm run test:security

echo "4️⃣ Running E2E tests..."
npm run test:e2e

echo "5️⃣ Running performance tests..."
npm run test:performance

echo "6️⃣ Generating coverage report..."
npm run test:coverage

echo "✅ All tests completed successfully!"
```

This comprehensive testing automation framework ensures high-quality, reliable, and performant software delivery through systematic testing at all levels of the application stack.