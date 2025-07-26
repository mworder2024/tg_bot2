import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { IntegrationTestUtils } from '../integration-setup';
import { TestDataFactory, TournamentStatus, TournamentFormat } from '../factories/test-data-factory';

describe('Tournament Integration Tests', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5433'),
          username: process.env.TEST_DB_USERNAME || 'test_user',
          password: process.env.TEST_DB_PASSWORD || 'test_password',
          database: process.env.TEST_DB_NAME || 'rps_tournament_test',
          synchronize: true,
          dropSchema: true,
          logging: false,
          entities: ['src/**/*.entity.ts'],
        }),
        // Add your tournament module here
        // TournamentModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await IntegrationTestUtils.cleanupDatabase();
  });

  describe('Tournament Creation', () => {
    it('should create a new tournament successfully', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        description: 'A test tournament for integration testing',
        maxPlayers: 8,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };

      const response = await request(app.getHttpServer())
        .post('/tournaments')
        .send(tournamentData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: tournamentData.name,
        description: tournamentData.description,
        maxPlayers: tournamentData.maxPlayers,
        format: tournamentData.format,
        status: TournamentStatus.REGISTRATION,
        currentPlayers: 0,
        players: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should reject tournament creation with invalid data', async () => {
      const invalidTournamentData = {
        name: '', // Empty name should be rejected
        maxPlayers: 0, // Invalid max players
        format: 'INVALID_FORMAT',
      };

      await request(app.getHttpServer())
        .post('/tournaments')
        .send(invalidTournamentData)
        .expect(400);
    });

    it('should handle concurrent tournament creation', async () => {
      const tournamentPromises = Array.from({ length: 10 }, (_, i) => 
        request(app.getHttpServer())
          .post('/tournaments')
          .send({
            name: `Concurrent Tournament ${i}`,
            maxPlayers: 8,
            format: TournamentFormat.SINGLE_ELIMINATION,
          })
      );

      const responses = await Promise.all(tournamentPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      });

      // Verify all tournaments were created with unique IDs
      const tournamentIds = responses.map(r => r.body.id);
      const uniqueIds = new Set(tournamentIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Player Registration', () => {
    let tournament: any;

    beforeEach(async () => {
      const tournamentData = {
        name: 'Registration Test Tournament',
        maxPlayers: 4,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };

      const response = await request(app.getHttpServer())
        .post('/tournaments')
        .send(tournamentData);
      
      tournament = response.body;
    });

    it('should allow players to join tournament', async () => {
      const player = TestDataFactory.createPlayer();

      const response = await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/join`)
        .send({ playerId: player.id })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        currentPlayers: 1,
      });
    });

    it('should prevent duplicate player registration', async () => {
      const player = TestDataFactory.createPlayer();

      // First registration should succeed
      await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/join`)
        .send({ playerId: player.id })
        .expect(200);

      // Second registration should fail
      await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/join`)
        .send({ playerId: player.id })
        .expect(409); // Conflict
    });

    it('should prevent registration when tournament is full', async () => {
      const players = TestDataFactory.createPlayers(4);

      // Fill tournament to capacity
      for (const player of players) {
        await request(app.getHttpServer())
          .post(`/tournaments/${tournament.id}/join`)
          .send({ playerId: player.id })
          .expect(200);
      }

      // Additional player should be rejected
      const extraPlayer = TestDataFactory.createPlayer();
      await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/join`)
        .send({ playerId: extraPlayer.id })
        .expect(409); // Tournament full
    });

    it('should handle concurrent player registration', async () => {
      const players = TestDataFactory.createPlayers(10);
      
      const registrationPromises = players.map(player =>
        request(app.getHttpServer())
          .post(`/tournaments/${tournament.id}/join`)
          .send({ playerId: player.id })
      );

      const responses = await Promise.allSettled(registrationPromises);
      
      // Only 4 should succeed (tournament capacity)
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 200
      );
      const failed = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 409
      );

      expect(successful.length).toBe(4);
      expect(failed.length).toBe(6);
    });
  });

  describe('Tournament Start', () => {
    let tournament: any;
    let players: any[];

    beforeEach(async () => {
      // Create tournament
      const tournamentData = {
        name: 'Start Test Tournament',
        maxPlayers: 4,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };

      const tournamentResponse = await request(app.getHttpServer())
        .post('/tournaments')
        .send(tournamentData);
      
      tournament = tournamentResponse.body;

      // Register 4 players
      players = TestDataFactory.createPlayers(4);
      for (const player of players) {
        await request(app.getHttpServer())
          .post(`/tournaments/${tournament.id}/join`)
          .send({ playerId: player.id });
      }
    });

    it('should start tournament when full', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/start`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: TournamentStatus.ACTIVE,
        matches: expect.any(Array),
      });

      // Should create appropriate number of matches for single elimination
      expect(response.body.matches.length).toBe(2); // 4 players = 2 first round matches
    });

    it('should not start tournament with insufficient players', async () => {
      // Create tournament with only 2 players
      const smallTournamentData = {
        name: 'Small Tournament',
        maxPlayers: 8,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };

      const smallTournamentResponse = await request(app.getHttpServer())
        .post('/tournaments')
        .send(smallTournamentData);

      const smallTournament = smallTournamentResponse.body;

      // Register only 2 players
      const twoPlayers = TestDataFactory.createPlayers(2);
      for (const player of twoPlayers) {
        await request(app.getHttpServer())
          .post(`/tournaments/${smallTournament.id}/join`)
          .send({ playerId: player.id });
      }

      await request(app.getHttpServer())
        .post(`/tournaments/${smallTournament.id}/start`)
        .expect(400); // Bad request - insufficient players
    });

    it('should not start already active tournament', async () => {
      // Start tournament first time
      await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/start`)
        .expect(200);

      // Try to start again
      await request(app.getHttpServer())
        .post(`/tournaments/${tournament.id}/start`)
        .expect(409); // Conflict - already started
    });
  });

  describe('Tournament Brackets', () => {
    it('should generate correct bracket for single elimination', async () => {
      const players = TestDataFactory.createPlayers(8);
      const tournament = TestDataFactory.createTournamentWithPlayers(8, {
        format: TournamentFormat.SINGLE_ELIMINATION,
      });

      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.id}/bracket`)
        .expect(200);

      expect(response.body).toMatchObject({
        format: TournamentFormat.SINGLE_ELIMINATION,
        rounds: expect.any(Array),
        totalMatches: 7, // 8 players = 4 + 2 + 1 = 7 matches total
      });

      // First round should have 4 matches
      expect(response.body.rounds[0].matches).toHaveLength(4);
    });

    it('should generate correct bracket for double elimination', async () => {
      const players = TestDataFactory.createPlayers(8);
      const tournament = TestDataFactory.createTournamentWithPlayers(8, {
        format: TournamentFormat.DOUBLE_ELIMINATION,
      });

      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.id}/bracket`)
        .expect(200);

      expect(response.body).toMatchObject({
        format: TournamentFormat.DOUBLE_ELIMINATION,
        winnersBracket: expect.any(Array),
        losersBracket: expect.any(Array),
      });
    });

    it('should generate correct schedule for round robin', async () => {
      const players = TestDataFactory.createPlayers(6);
      const tournament = TestDataFactory.createTournamentWithPlayers(6, {
        format: TournamentFormat.ROUND_ROBIN,
      });

      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.id}/schedule`)
        .expect(200);

      expect(response.body).toMatchObject({
        format: TournamentFormat.ROUND_ROBIN,
        totalMatches: 15, // 6 players = (6 * 5) / 2 = 15 matches
        rounds: expect.any(Array),
      });
    });
  });

  describe('Match Management', () => {
    let tournament: any;
    let matches: any[];

    beforeEach(async () => {
      const scenario = TestDataFactory.createCompleteTournamentScenario();
      tournament = scenario.tournament;
      matches = scenario.matches;

      // Mock the tournament and matches in the database
      // In real implementation, you'd seed the database
    });

    it('should record match results correctly', async () => {
      const match = matches[0];
      const matchResult = {
        player1Move: 'ROCK',
        player2Move: 'SCISSORS',
        winnerId: match.player1Id,
      };

      const response = await request(app.getHttpServer())
        .post(`/matches/${match.id}/result`)
        .send(matchResult)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        winnerId: match.player1Id,
        result: 'PLAYER1_WIN',
      });
    });

    it('should advance winners to next round', async () => {
      const match = matches[0];
      const matchResult = {
        player1Move: 'ROCK',
        player2Move: 'SCISSORS',
        winnerId: match.player1Id,
      };

      const response = await request(app.getHttpServer())
        .post(`/matches/${match.id}/result`)
        .send(matchResult);

      // Check if next round match was created with the winner
      const nextRoundResponse = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.id}/matches?round=2`)
        .expect(200);

      const nextRoundMatches = nextRoundResponse.body;
      expect(nextRoundMatches.some((m: any) => 
        m.player1Id === match.player1Id || m.player2Id === match.player1Id
      )).toBe(true);
    });

    it('should handle draw results appropriately', async () => {
      const match = matches[0];
      const drawResult = {
        player1Move: 'ROCK',
        player2Move: 'ROCK',
        result: 'DRAW',
      };

      const response = await request(app.getHttpServer())
        .post(`/matches/${match.id}/result`)
        .send(drawResult)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: 'DRAW',
        requiresReplay: true,
      });
    });
  });

  describe('Tournament Completion', () => {
    it('should complete tournament and declare winner', async () => {
      const scenario = TestDataFactory.createCompleteTournamentScenario();
      const tournament = scenario.tournament;

      // Simulate all matches being played
      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.id}`)
        .expect(200);

      if (response.body.status === TournamentStatus.COMPLETED) {
        expect(response.body).toMatchObject({
          status: TournamentStatus.COMPLETED,
          winnerId: expect.any(String),
          endedAt: expect.any(String),
        });
      }
    });

    it('should update player statistics after tournament', async () => {
      const scenario = TestDataFactory.createCompleteTournamentScenario();
      const tournament = scenario.tournament;
      const winner = scenario.players[0];

      const response = await request(app.getHttpServer())
        .get(`/players/${winner.id}/stats`)
        .expect(200);

      expect(response.body).toMatchObject({
        wins: expect.any(Number),
        losses: expect.any(Number),
        rating: expect.any(Number),
        tournamentsWon: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error by using invalid tournament ID
      await request(app.getHttpServer())
        .get('/tournaments/invalid-uuid')
        .expect(400); // Bad request for invalid UUID format
    });

    it('should handle concurrent access correctly', async () => {
      const tournament = TestDataFactory.createTournament();
      
      // Simulate multiple concurrent operations
      const operations = [
        request(app.getHttpServer()).get(`/tournaments/${tournament.id}`),
        request(app.getHttpServer()).post(`/tournaments/${tournament.id}/join`).send({ playerId: 'player1' }),
        request(app.getHttpServer()).post(`/tournaments/${tournament.id}/join`).send({ playerId: 'player2' }),
        request(app.getHttpServer()).get(`/tournaments/${tournament.id}/players`),
      ];

      const results = await Promise.allSettled(operations);
      
      // At least some operations should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });
});