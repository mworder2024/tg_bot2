import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { E2ETestUtils, E2EScenarios } from '../e2e-setup';
import { TestDataFactory } from '../factories/test-data-factory';

describe('Telegram Bot E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await E2ETestUtils.setupE2EApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    await E2ETestUtils.cleanupE2EData();
  });

  describe('Bot Commands', () => {
    it('should respond to /start command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/start', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
      
      // Verify welcome message was sent
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const userState = await redisClient.get('user:123456789:state');
        return userState === 'welcomed';
      });
    });

    it('should handle /help command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/help', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle /tournament command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/tournament', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle /play command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/play', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle /stats command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/stats', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle /leaderboard command', async () => {
      const update = E2ETestUtils.createTelegramUpdate('/leaderboard', 123456789);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(update);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Tournament Workflow', () => {
    it('should complete full tournament workflow', async () => {
      const result = await E2EScenarios.fullTournamentWorkflow();
      
      expect(result.tournamentId).toBeDefined();
      expect(result.playerIds).toHaveLength(4);
      expect(result.matchIds.length).toBeGreaterThan(0);
    });

    it('should handle tournament creation', async () => {
      const userId = 123456789;
      
      // Start bot
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/start', userId)
      );
      
      // Create tournament
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/tournament create "Test Tournament"', userId)
      );
      
      // Verify tournament was created
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const tournaments = await redisClient.keys('tournament:*');
        return tournaments.length > 0;
      });
    });

    it('should handle tournament joining', async () => {
      const userIds = [111111111, 222222222, 333333333, 444444444];
      
      // Create tournament first
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/tournament create "Join Test"', userIds[0])
      );
      
      // All users join tournament
      for (const userId of userIds) {
        await E2ETestUtils.simulateTelegramUpdate(
          E2ETestUtils.createTelegramUpdate('/tournament join', userId)
        );
      }
      
      // Verify all players are registered
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const players = await redisClient.sCard('tournament:1:players');
        return players === 4;
      });
    });

    it('should handle tournament start', async () => {
      const userIds = [111111111, 222222222, 333333333, 444444444];
      
      // Setup tournament with 4 players
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/tournament create "Start Test"', userIds[0])
      );
      
      for (const userId of userIds) {
        await E2ETestUtils.simulateTelegramUpdate(
          E2ETestUtils.createTelegramUpdate('/tournament join', userId)
        );
      }
      
      // Start tournament
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/tournament start', userIds[0])
      );
      
      // Verify tournament started
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const status = await redisClient.get('tournament:1:status');
        return status === 'ACTIVE';
      });
    });
  });

  describe('Game Play', () => {
    it('should handle game moves', async () => {
      const player1Id = 111111111;
      const player2Id = 222222222;
      
      // Setup active match
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/play rock', player1Id)
      );
      
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/play paper', player2Id)
      );
      
      // Verify game result
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const gameResult = await redisClient.get(`game:${player1Id}:${player2Id}:result`);
        return gameResult !== null;
      });
    });

    it('should handle invalid moves', async () => {
      const userId = 123456789;
      
      const response = await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/play invalid', userId)
      );
      
      expect(response.status).toBe(200);
      
      // Should receive error message
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const lastMessage = await redisClient.get(`user:${userId}:last_message`);
        return lastMessage && lastMessage.includes('invalid');
      });
    });

    it('should handle game timeouts', async () => {
      const player1Id = 111111111;
      
      // Start a game but don't complete it
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/play rock', player1Id)
      );
      
      // Wait for timeout (simulate timeout condition)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Game should timeout and clean up
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const activeGame = await redisClient.get(`user:${player1Id}:active_game`);
        return activeGame === null;
      });
    });
  });

  describe('Callback Queries', () => {
    it('should handle tournament join callback', async () => {
      const userId = 123456789;
      
      const callbackQuery = E2ETestUtils.createCallbackQueryUpdate('join_tournament', userId);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(callbackQuery);
      
      expect(response.status).toBe(200);
    });

    it('should handle game move callbacks', async () => {
      const userId = 123456789;
      
      const callbackQuery = E2ETestUtils.createCallbackQueryUpdate('play_rock', userId);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(callbackQuery);
      
      expect(response.status).toBe(200);
    });

    it('should handle tournament leave callback', async () => {
      const userId = 123456789;
      
      // First join tournament
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createCallbackQueryUpdate('join_tournament', userId)
      );
      
      // Then leave tournament
      const leaveCallback = E2ETestUtils.createCallbackQueryUpdate('leave_tournament', userId);
      
      const response = await E2ETestUtils.simulateTelegramUpdate(leaveCallback);
      
      expect(response.status).toBe(200);
    });
  });

  describe('User State Management', () => {
    it('should maintain user session state', async () => {
      const userId = 123456789;
      
      // Start conversation
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/start', userId)
      );
      
      // Check user state is tracked
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const userState = await redisClient.hGetAll(`user:${userId}:session`);
        return Object.keys(userState).length > 0;
      });
    });

    it('should handle user preferences', async () => {
      const userId = 123456789;
      
      // Set user preferences
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/settings notifications on', userId)
      );
      
      // Verify preferences saved
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const notifications = await redisClient.hGet(`user:${userId}:preferences`, 'notifications');
        return notifications === 'on';
      });
    });

    it('should handle user registration', async () => {
      const userId = 123456789;
      
      await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/start', userId)
      );
      
      // Verify user was registered
      const response = await request(app.getHttpServer())
        .get(`/players/telegram/${userId}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        telegramId: userId,
        isActive: true,
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent users', async () => {
      await E2EScenarios.performanceTestScenario(50);
      
      // Verify system stability
      const healthResponse = await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('ok');
    });

    it('should handle rapid message sequences', async () => {
      const userId = 123456789;
      const messages = [
        '/start',
        '/help',
        '/tournament',
        '/play',
        '/stats',
        '/leaderboard',
      ];
      
      // Send messages rapidly
      const promises = messages.map(message =>
        E2ETestUtils.simulateTelegramUpdate(
          E2ETestUtils.createTelegramUpdate(message, userId)
        )
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed updates gracefully', async () => {
      const malformedUpdate = {
        update_id: 123,
        // Missing required fields
      };
      
      const response = await request(app.getHttpServer())
        .post('/webhook/telegram')
        .send(malformedUpdate);
      
      // Should not crash, should return appropriate status
      expect([200, 400]).toContain(response.status);
    });

    it('should handle database connection issues', async () => {
      // Simulate database issue by using invalid tournament ID
      const response = await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/tournament join invalid-id', 123456789)
      );
      
      expect(response.status).toBe(200);
      
      // Should receive error message
      await E2ETestUtils.waitForCondition(async () => {
        const redisClient = E2ETestUtils.getRedisClient();
        const lastMessage = await redisClient.get('user:123456789:last_message');
        return lastMessage && lastMessage.includes('error');
      });
    });

    it('should handle Redis connection issues gracefully', async () => {
      // Temporarily disconnect Redis to simulate connection issue
      const redisClient = E2ETestUtils.getRedisClient();
      await redisClient.disconnect();
      
      const response = await E2ETestUtils.simulateTelegramUpdate(
        E2ETestUtils.createTelegramUpdate('/start', 123456789)
      );
      
      // Should handle gracefully
      expect(response.status).toBe(200);
      
      // Reconnect for cleanup
      await redisClient.connect();
    });
  });
});