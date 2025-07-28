import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/modules/app/app.module';
import { User } from '../../src/entities/user.entity';
import { Game } from '../../src/entities/game.entity';
import { UserStats } from '../../src/entities/user-stats.entity';
import { UserFactory } from '../factories/user.factory';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Game API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let gameRepository: Repository<Game>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Game, UserStats],
          synchronize: true,
          logging: false,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    gameRepository = moduleFixture.get<Repository<Game>>(getRepositoryToken(Game));
    
    await app.init();
  });

  beforeEach(async () => {
    // Clear database before each test
    await gameRepository.clear();
    await userRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/ping (GET)', () => {
    it('should return health check response', () => {
      return request(app.getHttpServer())
        .get('/api/v1/ping')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('/api/v1/ (GET)', () => {
    it('should return app information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('description');
        });
    });
  });

  describe('Game API Endpoints', () => {
    let player1: User;
    let player2: User;

    beforeEach(async () => {
      // Create test users
      const player1Data = UserFactory.create();
      const player2Data = UserFactory.create();
      
      player1 = await userRepository.save(player1Data);
      player2 = await userRepository.save(player2Data);
    });

    describe('POST /api/v1/games/quick-match', () => {
      it('should create a quick match game', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({ playerId: player1.id })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('status', 'WAITING_FOR_PLAYERS');
        expect(response.body).toHaveProperty('type', 'QUICK_MATCH');
        expect(response.body.player1.id).toBe(player1.id);
        expect(response.body.player2).toBeNull();
      });

      it('should return 404 for non-existent player', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({ playerId: 'non-existent-id' })
          .expect(404);
      });

      it('should validate request body', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({}) // Missing playerId
          .expect(400);
      });
    });

    describe('POST /api/v1/games/:id/join', () => {
      let gameId: string;

      beforeEach(async () => {
        // Create a game first
        const response = await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({ playerId: player1.id });
        
        gameId = response.body.id;
      });

      it('should allow player to join game', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/join`)
          .send({ playerId: player2.id })
          .expect(200);

        expect(response.body.status).toBe('WAITING_FOR_MOVES');
        expect(response.body.player1.id).toBe(player1.id);
        expect(response.body.player2.id).toBe(player2.id);
      });

      it('should return 404 for non-existent game', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/games/non-existent-id/join')
          .send({ playerId: player2.id })
          .expect(404);
      });

      it('should return 400 when trying to join full game', async () => {
        // First join
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/join`)
          .send({ playerId: player2.id });

        // Try to join again with another player
        const player3 = await userRepository.save(UserFactory.create());
        
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/join`)
          .send({ playerId: player3.id })
          .expect(400);
      });
    });

    describe('POST /api/v1/games/:id/move', () => {
      let gameId: string;

      beforeEach(async () => {
        // Create and join a game
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({ playerId: player1.id });
        
        gameId = createResponse.body.id;
        
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/join`)
          .send({ playerId: player2.id });
      });

      it('should allow player to submit move', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player1.id,
            move: 'ROCK'
          })
          .expect(200);

        expect(response.body.player1Move).toBe('ROCK');
        expect(response.body.status).toBe('WAITING_FOR_MOVES');
      });

      it('should complete game when both players submit moves', async () => {
        // Player 1 submits move
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player1.id,
            move: 'ROCK'
          });

        // Player 2 submits move
        const response = await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player2.id,
            move: 'SCISSORS'
          })
          .expect(200);

        expect(response.body.status).toBe('COMPLETED');
        expect(response.body.result).toBe('PLAYER1_WIN');
        expect(response.body.winner.id).toBe(player1.id);
        expect(response.body.completedAt).toBeDefined();
      });

      it('should validate move values', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player1.id,
            move: 'INVALID_MOVE'
          })
          .expect(400);
      });

      it('should prevent duplicate moves from same player', async () => {
        // Submit first move
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player1.id,
            move: 'ROCK'
          });

        // Try to submit another move
        await request(app.getHttpServer())
          .post(`/api/v1/games/${gameId}/move`)
          .send({ 
            playerId: player1.id,
            move: 'PAPER'
          })
          .expect(400);
      });
    });

    describe('GET /api/v1/games/:id', () => {
      let gameId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/games/quick-match')
          .send({ playerId: player1.id });
        
        gameId = response.body.id;
      });

      it('should return game details', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/games/${gameId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', gameId);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('player1');
      });

      it('should return 404 for non-existent game', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/games/non-existent-id')
          .expect(404);
      });
    });

    describe('GET /api/v1/games/history/:playerId', () => {
      beforeEach(async () => {
        // Create multiple completed games for player1
        for (let i = 0; i < 3; i++) {
          const game = await request(app.getHttpServer())
            .post('/api/v1/games/quick-match')
            .send({ playerId: player1.id });

          await request(app.getHttpServer())
            .post(`/api/v1/games/${game.body.id}/join`)
            .send({ playerId: player2.id });

          await request(app.getHttpServer())
            .post(`/api/v1/games/${game.body.id}/move`)
            .send({ playerId: player1.id, move: 'ROCK' });

          await request(app.getHttpServer())
            .post(`/api/v1/games/${game.body.id}/move`)
            .send({ playerId: player2.id, move: 'SCISSORS' });
        }
      });

      it('should return player game history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/games/history/${player1.id}`)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toHaveLength(3);
        
        response.body.forEach((game) => {
          expect(game).toHaveProperty('id');
          expect(game).toHaveProperty('status', 'COMPLETED');
          expect(game).toHaveProperty('result', 'PLAYER1_WIN');
        });
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/games/history/${player1.id}?limit=2`)
          .expect(200);

        expect(response.body).toHaveLength(2);
      });

      it('should return empty array for player with no games', async () => {
        const player3 = await userRepository.save(UserFactory.create());
        
        const response = await request(app.getHttpServer())
          .get(`/api/v1/games/history/${player3.id}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/games/quick-match')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/games/quick-match')
        .send({ playerId: 'invalid-id' })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ping')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('CORS', () => {
    it('should handle preflight requests', async () => {
      await request(app.getHttpServer())
        .options('/api/v1/games/quick-match')
        .expect(204);
    });
  });
});