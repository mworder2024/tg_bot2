import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentService } from '../../src/tournament/tournament.service';
import { Tournament, TournamentStatus } from '../../src/tournament/entities/tournament.entity';
import { Player } from '../../src/player/entities/player.entity';
import { Match } from '../../src/match/entities/match.entity';
import { TestDatabase } from '../utils/test-database';
import { TestDataFactory, TestScenarios } from '../factories/test-data-factory';

describe('Tournament Integration Tests', () => {
  let app: INestApplication;
  let tournamentService: TournamentService;
  let tournamentRepository: Repository<Tournament>;
  let playerRepository: Repository<Player>;
  let matchRepository: Repository<Match>;

  beforeAll(async () => {
    const entities = [Tournament, Player, Match];
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabase.createTestDatabase(entities),
        // Add your tournament module here
        // TournamentModule,
      ],
      providers: [
        TournamentService,
        // Add other required services
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    tournamentService = module.get<TournamentService>(TournamentService);
    tournamentRepository = TestDatabase.getRepository(app, Tournament);
    playerRepository = TestDatabase.getRepository(app, Player);
    matchRepository = TestDatabase.getRepository(app, Match);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestDatabase.cleanDatabase(app, [Tournament, Player, Match]);
  });

  describe('Tournament Creation', () => {
    it('should create a tournament with default settings', async () => {
      // Arrange
      const tournamentData = {
        name: 'Test Tournament',
        maxPlayers: 8,
        description: 'Integration test tournament',
      };

      // Act
      const tournament = await tournamentService.createTournament(tournamentData);

      // Assert
      expect(tournament).toBeDefined();
      expect(tournament.id).toBeValidUUID();
      expect(tournament.name).toBe(tournamentData.name);
      expect(tournament.maxPlayers).toBe(tournamentData.maxPlayers);
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION);
      expect(tournament.currentPlayers).toBe(0);
      expect(tournament.createdAt).toBeValidDate();

      // Verify in database
      const savedTournament = await tournamentRepository.findOneBy({ id: tournament.id });
      expect(savedTournament).toEqual(tournament);
    });

    it('should enforce unique tournament names', async () => {
      // Arrange
      const tournamentData = {
        name: 'Unique Tournament',
        maxPlayers: 8,
      };

      await tournamentService.createTournament(tournamentData);

      // Act & Assert
      await expect(
        tournamentService.createTournament(tournamentData)
      ).rejects.toThrow('Tournament name already exists');
    });

    it('should validate maximum player limits', async () => {
      // Arrange
      const invalidData = {
        name: 'Invalid Tournament',
        maxPlayers: 3, // Invalid - not power of 2
      };

      // Act & Assert
      await expect(
        tournamentService.createTournament(invalidData)
      ).rejects.toThrow('Maximum players must be a power of 2');
    });
  });

  describe('Player Registration', () => {
    let tournament: Tournament;
    let players: Player[];

    beforeEach(async () => {
      tournament = await tournamentRepository.save(TestScenarios.emptyTournament());
      players = await playerRepository.save(TestDataFactory.createPlayers(8));
    });

    it('should register player to tournament', async () => {
      // Act
      const result = await tournamentService.registerPlayer(tournament.id, players[0].id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tournament.currentPlayers).toBe(1);
      expect(result.tournament.players).toHaveLength(1);
      expect(result.tournament.players[0].id).toBe(players[0].id);
    });

    it('should prevent duplicate registration', async () => {
      // Arrange
      await tournamentService.registerPlayer(tournament.id, players[0].id);

      // Act & Assert
      await expect(
        tournamentService.registerPlayer(tournament.id, players[0].id)
      ).rejects.toThrow('Player already registered');
    });

    it('should prevent registration when tournament is full', async () => {
      // Arrange
      tournament.maxPlayers = 2;
      tournament = await tournamentRepository.save(tournament);

      await tournamentService.registerPlayer(tournament.id, players[0].id);
      await tournamentService.registerPlayer(tournament.id, players[1].id);

      // Act & Assert
      await expect(
        tournamentService.registerPlayer(tournament.id, players[2].id)
      ).rejects.toThrow('Tournament is full');
    });

    it('should auto-start tournament when full', async () => {
      // Arrange
      tournament.maxPlayers = 4;
      tournament = await tournamentRepository.save(tournament);

      // Act - Register all players
      for (let i = 0; i < 4; i++) {
        await tournamentService.registerPlayer(tournament.id, players[i].id);
      }

      // Assert
      const updatedTournament = await tournamentRepository.findOneBy({ id: tournament.id });
      expect(updatedTournament.status).toBe(TournamentStatus.ACTIVE);
      expect(updatedTournament.startedAt).toBeValidDate();

      // Check that matches were created
      const matches = await matchRepository.find({ where: { tournamentId: tournament.id } });
      expect(matches).toHaveLength(2); // First round of single elimination
    });
  });

  describe('Tournament Progression', () => {
    let tournament: Tournament;
    let players: Player[];

    beforeEach(async () => {
      // Create a tournament with 4 players ready to start
      players = await playerRepository.save(TestDataFactory.createPlayers(4));
      tournament = await tournamentRepository.save(TestScenarios.emptyTournament());
      tournament.maxPlayers = 4;
      
      // Register all players
      for (const player of players) {
        await tournamentService.registerPlayer(tournament.id, player.id);
      }

      tournament = await tournamentRepository.findOne({
        where: { id: tournament.id },
        relations: ['players', 'matches'],
      });
    });

    it('should create correct bracket structure', async () => {
      // Assert tournament structure
      expect(tournament.status).toBe(TournamentStatus.ACTIVE);
      
      const matches = await matchRepository.find({ 
        where: { tournamentId: tournament.id },
        order: { round: 'ASC' },
      });

      // Should have 2 first-round matches + 1 final match
      expect(matches).toHaveLength(3);
      
      const firstRoundMatches = matches.filter(m => m.round === 1);
      const finalMatches = matches.filter(m => m.round === 2);
      
      expect(firstRoundMatches).toHaveLength(2);
      expect(finalMatches).toHaveLength(1);
    });

    it('should progress through tournament rounds', async () => {
      // Get first round matches
      const firstRoundMatches = await matchRepository.find({
        where: { tournamentId: tournament.id, round: 1 },
      });

      // Complete first round matches
      for (const match of firstRoundMatches) {
        await tournamentService.completeMatch(match.id, match.player1Id); // Player 1 wins
      }

      // Check that final match is ready
      const finalMatch = await matchRepository.findOne({
        where: { tournamentId: tournament.id, round: 2 },
      });

      expect(finalMatch.status).toBe('PENDING');
      expect(finalMatch.player1Id).toBeDefined();
      expect(finalMatch.player2Id).toBeDefined();
    });

    it('should declare tournament winner', async () => {
      // Complete all matches with specific winners
      const allMatches = await matchRepository.find({
        where: { tournamentId: tournament.id },
        order: { round: 'ASC' },
      });

      // Complete first round
      const firstRoundMatches = allMatches.filter(m => m.round === 1);
      const winners = [];
      
      for (const match of firstRoundMatches) {
        await tournamentService.completeMatch(match.id, match.player1Id);
        winners.push(match.player1Id);
      }

      // Complete final
      const finalMatch = await matchRepository.findOne({
        where: { tournamentId: tournament.id, round: 2 },
      });
      
      const championId = finalMatch.player1Id;
      await tournamentService.completeMatch(finalMatch.id, championId);

      // Assert tournament completion
      const completedTournament = await tournamentRepository.findOneBy({ id: tournament.id });
      expect(completedTournament.status).toBe(TournamentStatus.COMPLETED);
      expect(completedTournament.winnerId).toBe(championId);
      expect(completedTournament.endedAt).toBeValidDate();
    });
  });

  describe('Tournament Statistics', () => {
    it('should calculate tournament statistics correctly', async () => {
      // Arrange - Create completed tournament scenario
      const { tournament, players, matches } = TestDataFactory.createCompleteTournamentScenario();
      
      await playerRepository.save(players);
      const savedTournament = await tournamentRepository.save(tournament);
      await matchRepository.save(matches.map(m => ({ ...m, tournamentId: savedTournament.id })));

      // Act
      const stats = await tournamentService.getTournamentStatistics(savedTournament.id);

      // Assert
      expect(stats).toEqual({
        totalPlayers: 8,
        totalMatches: matches.length,
        averageMatchDuration: expect.any(Number),
        playerStats: expect.any(Array),
        tournamentDuration: expect.any(Number),
      });
    });
  });

  describe('Concurrent Tournament Operations', () => {
    it('should handle multiple tournaments simultaneously', async () => {
      // Arrange
      const tournamentPromises = Array.from({ length: 5 }, (_, i) => 
        tournamentService.createTournament({
          name: `Concurrent Tournament ${i}`,
          maxPlayers: 8,
        })
      );

      // Act
      const tournaments = await Promise.all(tournamentPromises);

      // Assert
      expect(tournaments).toHaveLength(5);
      tournaments.forEach((tournament, index) => {
        expect(tournament.name).toBe(`Concurrent Tournament ${index}`);
        expect(tournament.status).toBe(TournamentStatus.REGISTRATION);
      });

      // Verify all tournaments exist in database
      const allTournaments = await tournamentRepository.find();
      expect(allTournaments).toHaveLength(5);
    });

    it('should handle concurrent player registrations', async () => {
      // Arrange
      const tournament = await tournamentRepository.save(TestScenarios.emptyTournament());
      tournament.maxPlayers = 8;
      await tournamentRepository.save(tournament);

      const players = await playerRepository.save(TestDataFactory.createPlayers(8));

      // Act - Register all players concurrently
      const registrationPromises = players.map(player =>
        tournamentService.registerPlayer(tournament.id, player.id)
      );

      const results = await Promise.all(registrationPromises);

      // Assert
      expect(results).toHaveLength(8);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const finalTournament = await tournamentRepository.findOne({
        where: { id: tournament.id },
        relations: ['players'],
      });

      expect(finalTournament.currentPlayers).toBe(8);
      expect(finalTournament.players).toHaveLength(8);
      expect(finalTournament.status).toBe(TournamentStatus.ACTIVE);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database transaction failures', async () => {
      // Arrange - Force a transaction failure
      const tournamentData = {
        name: 'Test Tournament',
        maxPlayers: 8,
      };

      // Mock a database constraint violation
      jest.spyOn(tournamentRepository, 'save').mockRejectedValueOnce(
        new Error('Database constraint violation')
      );

      // Act & Assert
      await expect(
        tournamentService.createTournament(tournamentData)
      ).rejects.toThrow('Failed to create tournament');

      // Verify no partial data was saved
      const tournaments = await tournamentRepository.find();
      expect(tournaments).toHaveLength(0);
    });

    it('should rollback failed tournament registrations', async () => {
      // This test would verify that if player registration fails
      // after partially updating the tournament, everything is rolled back
      
      const tournament = await tournamentRepository.save(TestScenarios.emptyTournament());
      const player = await playerRepository.save(TestDataFactory.createPlayer());

      // Mock failure during player-tournament relationship creation
      jest.spyOn(tournamentService, 'addPlayerToTournament')
        .mockRejectedValueOnce(new Error('Relationship creation failed'));

      // Act & Assert
      await expect(
        tournamentService.registerPlayer(tournament.id, player.id)
      ).rejects.toThrow();

      // Verify tournament state wasn't partially modified
      const unchangedTournament = await tournamentRepository.findOneBy({ id: tournament.id });
      expect(unchangedTournament.currentPlayers).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large tournament registration efficiently', async () => {
      // Arrange
      const tournament = await tournamentRepository.save(TestScenarios.emptyTournament());
      tournament.maxPlayers = 64;
      await tournamentRepository.save(tournament);

      const players = await playerRepository.save(TestDataFactory.createPlayers(64));

      const startTime = Date.now();

      // Act
      const registrationPromises = players.map(player =>
        tournamentService.registerPlayer(tournament.id, player.id)
      );

      await Promise.all(registrationPromises);

      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const finalTournament = await tournamentRepository.findOne({
        where: { id: tournament.id },
        relations: ['players'],
      });

      expect(finalTournament.currentPlayers).toBe(64);
      expect(finalTournament.status).toBe(TournamentStatus.ACTIVE);
    });

    it('should efficiently query tournament data', async () => {
      // Arrange - Create multiple tournaments with players
      const { players, tournaments } = TestDataFactory.createLargeDataset({
        playerCount: 100,
        tournamentCount: 20,
      });

      await playerRepository.save(players);
      await tournamentRepository.save(tournaments);

      const startTime = Date.now();

      // Act
      const activeTournaments = await tournamentService.getActiveTournaments();
      const tournamentStats = await Promise.all(
        activeTournaments.slice(0, 5).map(t => 
          tournamentService.getTournamentStatistics(t.id)
        )
      );

      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(activeTournaments).toBeDefined();
      expect(tournamentStats).toHaveLength(5);
    });
  });
});