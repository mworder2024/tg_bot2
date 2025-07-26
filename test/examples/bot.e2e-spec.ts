import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramBotService } from '../../src/telegram/telegram-bot.service';
import { TournamentService } from '../../src/tournament/tournament.service';
import { PlayerService } from '../../src/player/player.service';
import { MockTelegramBot, TelegramTestUtils } from '../mocks/telegram-bot.mock';
import { TestDatabase } from '../utils/test-database';
import { TestDataFactory } from '../factories/test-data-factory';
import { Tournament } from '../../src/tournament/entities/tournament.entity';
import { Player } from '../../src/player/entities/player.entity';
import { Match } from '../../src/match/entities/match.entity';
import { Game } from '../../src/game/entities/game.entity';

describe('Telegram Bot E2E Tests', () => {
  let app: INestApplication;
  let botService: TelegramBotService;
  let tournamentService: TournamentService;
  let playerService: PlayerService;
  let mockBot: MockTelegramBot;

  beforeAll(async () => {
    const entities = [Tournament, Player, Match, Game];
    mockBot = new MockTelegramBot();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabase.createTestDatabase(entities),
        // Add your modules here
        // TelegramModule,
        // TournamentModule,
        // PlayerModule,
      ],
      providers: [
        TelegramBotService,
        TournamentService,
        PlayerService,
        {
          provide: 'TELEGRAM_BOT',
          useValue: mockBot,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    botService = module.get<TelegramBotService>(TelegramBotService);
    tournamentService = module.get<TournamentService>(TournamentService);
    playerService = module.get<PlayerService>(PlayerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestDatabase.cleanDatabase(app, [Tournament, Player, Match, Game]);
    mockBot.reset();
  });

  describe('User Registration Flow', () => {
    it('should handle complete user registration', async () => {
      // Arrange
      const context = TelegramTestUtils.createTestContext({
        message: { text: '/start' }
      });

      // Act
      await botService.handleStart(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Welcome to RPS Tournament Bot!'
      );

      // Verify user was created in database
      const player = await playerService.findByTelegramId(context.from.id);
      expect(player).toBeDefined();
      expect(player.telegramId).toBe(context.from.id);
      expect(player.username).toBe(context.from.username);
    });

    it('should handle returning user', async () => {
      // Arrange
      const existingPlayer = await playerService.create({
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
      });

      const context = TelegramTestUtils.createTestContext({
        from: { id: existingPlayer.telegramId }
      });

      // Act
      await botService.handleStart(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Welcome back'
      );
    });
  });

  describe('Tournament Creation Flow', () => {
    let playerContext: any;

    beforeEach(async () => {
      // Create a registered player
      const player = await playerService.create({
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
      });

      playerContext = TelegramTestUtils.createTestContext({
        from: { id: player.telegramId }
      });
    });

    it('should create tournament successfully', async () => {
      // Act - Start tournament creation
      playerContext.message.text = '/create_tournament';
      await botService.handleCreateTournament(playerContext);

      // Assert - Bot asks for tournament name
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Please enter a name for your tournament:'
      );

      // Act - Provide tournament name
      playerContext.message.text = 'Test Tournament';
      await botService.handleMessage(playerContext);

      // Assert - Bot asks for max players
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'How many players should this tournament support?'
      );

      // Act - Provide max players
      playerContext.message.text = '8';
      await botService.handleMessage(playerContext);

      // Assert - Tournament created
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Tournament "Test Tournament" created successfully!'
      );

      // Verify tournament in database
      const tournaments = await tournamentService.findAll();
      expect(tournaments).toHaveLength(1);
      expect(tournaments[0].name).toBe('Test Tournament');
      expect(tournaments[0].maxPlayers).toBe(8);
    });

    it('should handle invalid tournament parameters', async () => {
      // Act - Try to create tournament with invalid player count
      playerContext.message.text = '/create_tournament';
      await botService.handleCreateTournament(playerContext);

      playerContext.message.text = 'Invalid Tournament';
      await botService.handleMessage(playerContext);

      playerContext.message.text = '5'; // Invalid - not power of 2
      await botService.handleMessage(playerContext);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Player count must be a power of 2'
      );
    });
  });

  describe('Tournament Registration Flow', () => {
    let tournament: Tournament;
    let players: Player[];

    beforeEach(async () => {
      // Create tournament and players
      tournament = await tournamentService.create({
        name: 'Test Tournament',
        maxPlayers: 4,
        description: 'E2E Test Tournament',
      });

      players = await Promise.all([
        playerService.create({
          telegramId: 111111111,
          username: 'player1',
          firstName: 'Player One',
        }),
        playerService.create({
          telegramId: 222222222,
          username: 'player2',
          firstName: 'Player Two',
        }),
        playerService.create({
          telegramId: 333333333,
          username: 'player3',
          firstName: 'Player Three',
        }),
        playerService.create({
          telegramId: 444444444,
          username: 'player4',
          firstName: 'Player Four',
        }),
      ]);
    });

    it('should handle tournament registration', async () => {
      // Act - Player joins tournament
      const context = TelegramTestUtils.createTestContext({
        from: { id: players[0].telegramId },
        message: { text: `/join ${tournament.id}` }
      });

      await botService.handleJoinTournament(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Successfully registered for tournament'
      );

      // Verify registration in database
      const updatedTournament = await tournamentService.findById(tournament.id);
      expect(updatedTournament.currentPlayers).toBe(1);
    });

    it('should start tournament when full', async () => {
      // Act - All players join tournament
      for (let i = 0; i < 4; i++) {
        const context = TelegramTestUtils.createTestContext({
          from: { id: players[i].telegramId },
          message: { text: `/join ${tournament.id}` }
        });

        await botService.handleJoinTournament(context);
      }

      // Assert - Tournament started message sent
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Tournament is now starting!'
      );

      // Verify tournament status
      const updatedTournament = await tournamentService.findById(tournament.id);
      expect(updatedTournament.status).toBe('ACTIVE');
      expect(updatedTournament.startedAt).toBeDefined();
    });

    it('should prevent joining full tournament', async () => {
      // Arrange - Fill tournament
      for (let i = 0; i < 4; i++) {
        await tournamentService.registerPlayer(tournament.id, players[i].id);
      }

      // Create additional player
      const extraPlayer = await playerService.create({
        telegramId: 555555555,
        username: 'extraplayer',
        firstName: 'Extra Player',
      });

      // Act - Try to join full tournament
      const context = TelegramTestUtils.createTestContext({
        from: { id: extraPlayer.telegramId },
        message: { text: `/join ${tournament.id}` }
      });

      await botService.handleJoinTournament(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Tournament is full'
      );
    });
  });

  describe('Game Play Flow', () => {
    let tournament: Tournament;
    let players: Player[];
    let match: any;

    beforeEach(async () => {
      // Create and fill tournament
      tournament = await tournamentService.create({
        name: 'Game Test Tournament',
        maxPlayers: 4,
      });

      players = await Promise.all([
        playerService.create({
          telegramId: 111111111,
          username: 'player1',
          firstName: 'Player One',
        }),
        playerService.create({
          telegramId: 222222222,
          username: 'player2',
          firstName: 'Player Two',
        }),
      ]);

      // Register players and start tournament
      await Promise.all(
        players.slice(0, 2).map(player =>
          tournamentService.registerPlayer(tournament.id, player.id)
        )
      );

      // Get the created match
      const matches = await tournamentService.getTournamentMatches(tournament.id);
      match = matches[0];
    });

    it('should handle complete game play', async () => {
      // Act - Player 1 makes move
      const player1Context = TelegramTestUtils.createCallbackContext(
        `play_${match.id}_rock`,
        { from: { id: players[0].telegramId } }
      );

      await botService.handleGameMove(player1Context);

      // Assert - Waiting for opponent message
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Move submitted! Waiting for opponent...'
      );

      // Act - Player 2 makes move
      const player2Context = TelegramTestUtils.createCallbackContext(
        `play_${match.id}_scissors`,
        { from: { id: players[1].telegramId } }
      );

      await botService.handleGameMove(player2Context);

      // Assert - Game result announced
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Player One wins! Rock beats Scissors'
      );

      // Verify game in database
      const games = await tournamentService.getMatchGames(match.id);
      expect(games).toHaveLength(1);
      expect(games[0].result).toBe('PLAYER1_WIN');
    });

    it('should handle draw scenarios', async () => {
      // Act - Both players choose same move
      const player1Context = TelegramTestUtils.createCallbackContext(
        `play_${match.id}_rock`,
        { from: { id: players[0].telegramId } }
      );

      const player2Context = TelegramTestUtils.createCallbackContext(
        `play_${match.id}_rock`,
        { from: { id: players[1].telegramId } }
      );

      await botService.handleGameMove(player1Context);
      await botService.handleGameMove(player2Context);

      // Assert - Draw message sent
      TelegramTestUtils.assertMessageSent(
        mockBot,
        "It's a draw! Both players chose Rock"
      );

      // Assert - New round started
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Starting new round...'
      );
    });

    it('should handle timeout scenarios', async () => {
      // Act - Only one player makes move, then timeout
      const player1Context = TelegramTestUtils.createCallbackContext(
        `play_${match.id}_rock`,
        { from: { id: players[0].telegramId } }
      );

      await botService.handleGameMove(player1Context);

      // Simulate timeout
      await botService.handleMatchTimeout(match.id);

      // Assert - Timeout message sent
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Match timed out. Player One wins by default.'
      );
    });
  });

  describe('Tournament Completion Flow', () => {
    it('should handle complete tournament lifecycle', async () => {
      // Arrange - Create 4-player tournament
      const tournament = await tournamentService.create({
        name: 'Complete Tournament',
        maxPlayers: 4,
      });

      const players = await Promise.all([
        playerService.create({ telegramId: 111111111, username: 'p1', firstName: 'P1' }),
        playerService.create({ telegramId: 222222222, username: 'p2', firstName: 'P2' }),
        playerService.create({ telegramId: 333333333, username: 'p3', firstName: 'P3' }),
        playerService.create({ telegramId: 444444444, username: 'p4', firstName: 'P4' }),
      ]);

      // Act - Register all players
      for (const player of players) {
        const context = TelegramTestUtils.createTestContext({
          from: { id: player.telegramId },
          message: { text: `/join ${tournament.id}` }
        });
        await botService.handleJoinTournament(context);
      }

      // Simulate tournament progression
      const matches = await tournamentService.getTournamentMatches(tournament.id);
      
      // Complete first round matches
      for (const match of matches.filter(m => m.round === 1)) {
        await tournamentService.completeMatch(match.id, match.player1Id);
      }

      // Complete final match
      const finalMatch = matches.find(m => m.round === 2);
      await tournamentService.completeMatch(finalMatch.id, finalMatch.player1Id);

      // Assert - Tournament completion announced
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Tournament Complete!'
      );

      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Champion: P1'
      );

      // Verify tournament completion
      const completedTournament = await tournamentService.findById(tournament.id);
      expect(completedTournament.status).toBe('COMPLETED');
      expect(completedTournament.winnerId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', async () => {
      // Act
      const context = TelegramTestUtils.createTestContext({
        message: { text: '/invalid_command' }
      });

      await botService.handleMessage(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Unknown command. Type /help for available commands.'
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange - Mock database error
      jest.spyOn(playerService, 'findByTelegramId')
        .mockRejectedValueOnce(new Error('Database connection lost'));

      // Act
      const context = TelegramTestUtils.createTestContext();
      await botService.handleStart(context);

      // Assert
      TelegramTestUtils.assertMessageSent(
        mockBot,
        'Sorry, something went wrong. Please try again later.'
      );
    });

    it('should handle Telegram API errors', async () => {
      // Arrange - Mock Telegram API error
      mockBot.telegram.sendMessage.mockRejectedValueOnce(
        new Error('Message too long')
      );

      // Act
      const context = TelegramTestUtils.createTestContext();
      await botService.handleStart(context);

      // Assert - Error should be logged but not crash
      expect(mockBot.telegram.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid command sequences', async () => {
      // Arrange
      const player = await playerService.create({
        telegramId: 123456789,
        username: 'speedtest',
        firstName: 'Speed Test',
      });

      const contexts = Array.from({ length: 10 }, () =>
        TelegramTestUtils.createTestContext({
          from: { id: player.telegramId },
          message: { text: '/help' }
        })
      );

      const startTime = Date.now();

      // Act - Send many commands rapidly
      await Promise.all(
        contexts.map(context => botService.handleHelp(context))
      );

      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(1000); // Should handle 10 commands in under 1 second
      expect(mockBot.getMessageCount()).toBe(10);
    });

    it('should handle concurrent tournament operations', async () => {
      // Arrange
      const players = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          playerService.create({
            telegramId: 100000000 + i,
            username: `player${i}`,
            firstName: `Player ${i}`,
          })
        )
      );

      const tournament = await tournamentService.create({
        name: 'Concurrent Test',
        maxPlayers: 16,
      });

      // Act - Concurrent registrations
      const registrationPromises = players.slice(0, 16).map(player => {
        const context = TelegramTestUtils.createTestContext({
          from: { id: player.telegramId },
          message: { text: `/join ${tournament.id}` }
        });
        return botService.handleJoinTournament(context);
      });

      await Promise.all(registrationPromises);

      // Assert
      const updatedTournament = await tournamentService.findById(tournament.id);
      expect(updatedTournament.currentPlayers).toBe(16);
      expect(updatedTournament.status).toBe('ACTIVE');
    });
  });
});