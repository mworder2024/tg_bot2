import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from '../../src/game/game.service';
import { Game, GameMove, GameResult } from '../../src/game/entities/game.entity';
import { Match } from '../../src/match/entities/match.entity';
import { Player } from '../../src/player/entities/player.entity';
import { TestDataFactory } from '../factories/test-data-factory';
import { createMockRepository } from '../utils/test-database';

describe('GameService', () => {
  let service: GameService;
  let gameRepository: jest.Mocked<Repository<Game>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let playerRepository: jest.Mocked<Repository<Player>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: getRepositoryToken(Game),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(Player),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameRepository = module.get(getRepositoryToken(Game));
    matchRepository = module.get(getRepositoryToken(Match));
    playerRepository = module.get(getRepositoryToken(Player));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('playGame', () => {
    it('should create a game with player moves', async () => {
      // Arrange
      const match = TestDataFactory.createMatch();
      const player1 = TestDataFactory.createPlayer();
      const player2 = TestDataFactory.createPlayer();
      const gameData = {
        matchId: match.id,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Move: GameMove.ROCK,
        player2Move: GameMove.SCISSORS,
      };

      const expectedGame = TestDataFactory.createGame({
        ...gameData,
        result: GameResult.PLAYER1_WIN,
        winnerId: player1.id,
      });

      matchRepository.findOneBy.mockResolvedValue(match);
      playerRepository.findOneBy
        .mockResolvedValueOnce(player1)
        .mockResolvedValueOnce(player2);
      gameRepository.create.mockReturnValue(expectedGame as any);
      gameRepository.save.mockResolvedValue(expectedGame);

      // Act
      const result = await service.playGame(gameData);

      // Assert
      expect(result).toEqual(expectedGame);
      expect(gameRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: match.id,
          player1Move: GameMove.ROCK,
          player2Move: GameMove.SCISSORS,
          result: GameResult.PLAYER1_WIN,
          winnerId: player1.id,
        })
      );
    });

    it('should handle draw result correctly', async () => {
      // Arrange
      const match = TestDataFactory.createMatch();
      const player1 = TestDataFactory.createPlayer();
      const player2 = TestDataFactory.createPlayer();
      const gameData = {
        matchId: match.id,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Move: GameMove.ROCK,
        player2Move: GameMove.ROCK,
      };

      const expectedGame = TestDataFactory.createGame({
        ...gameData,
        result: GameResult.DRAW,
        winnerId: null,
      });

      matchRepository.findOneBy.mockResolvedValue(match);
      playerRepository.findOneBy
        .mockResolvedValueOnce(player1)
        .mockResolvedValueOnce(player2);
      gameRepository.create.mockReturnValue(expectedGame as any);
      gameRepository.save.mockResolvedValue(expectedGame);

      // Act
      const result = await service.playGame(gameData);

      // Assert
      expect(result.result).toBe(GameResult.DRAW);
      expect(result.winnerId).toBeNull();
    });

    it('should throw error for invalid match', async () => {
      // Arrange
      const gameData = {
        matchId: 'invalid-match-id',
        player1Id: 'player1',
        player2Id: 'player2',
        player1Move: GameMove.ROCK,
        player2Move: GameMove.SCISSORS,
      };

      matchRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.playGame(gameData)).rejects.toThrow('Match not found');
      expect(gameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for invalid players', async () => {
      // Arrange
      const match = TestDataFactory.createMatch();
      const gameData = {
        matchId: match.id,
        player1Id: 'invalid-player-id',
        player2Id: 'player2',
        player1Move: GameMove.ROCK,
        player2Move: GameMove.SCISSORS,
      };

      matchRepository.findOneBy.mockResolvedValue(match);
      playerRepository.findOneBy.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.playGame(gameData)).rejects.toThrow('Player not found');
    });
  });

  describe('getGameHistory', () => {
    it('should return games for a player', async () => {
      // Arrange
      const player = TestDataFactory.createPlayer();
      const games = [
        TestDataFactory.createGame({ player1Id: player.id }),
        TestDataFactory.createGame({ player2Id: player.id }),
      ];

      gameRepository.find.mockResolvedValue(games);

      // Act
      const result = await service.getGameHistory(player.id);

      // Assert
      expect(result).toEqual(games);
      expect(gameRepository.find).toHaveBeenCalledWith({
        where: [
          { player1Id: player.id },
          { player2Id: player.id },
        ],
        order: { playedAt: 'DESC' },
        take: 50,
      });
    });

    it('should limit results to specified count', async () => {
      // Arrange
      const player = TestDataFactory.createPlayer();
      const limit = 10;

      gameRepository.find.mockResolvedValue([]);

      // Act
      await service.getGameHistory(player.id, limit);

      // Assert
      expect(gameRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: limit,
        })
      );
    });
  });

  describe('getGameStats', () => {
    it('should calculate player statistics correctly', async () => {
      // Arrange
      const player = TestDataFactory.createPlayer();
      const games = [
        TestDataFactory.createGame({ 
          player1Id: player.id, 
          result: GameResult.PLAYER1_WIN,
          winnerId: player.id,
        }),
        TestDataFactory.createGame({ 
          player1Id: player.id, 
          result: GameResult.PLAYER2_WIN,
          winnerId: 'other-player',
        }),
        TestDataFactory.createGame({ 
          player2Id: player.id, 
          result: GameResult.DRAW,
          winnerId: null,
        }),
      ];

      gameRepository.find.mockResolvedValue(games);

      // Act
      const result = await service.getGameStats(player.id);

      // Assert
      expect(result).toEqual({
        totalGames: 3,
        wins: 1,
        losses: 1,
        draws: 1,
        winRate: 0.333,
      });
    });

    it('should handle player with no games', async () => {
      // Arrange
      const player = TestDataFactory.createPlayer();
      gameRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getGameStats(player.id);

      // Assert
      expect(result).toEqual({
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
      });
    });
  });

  describe('determineWinner', () => {
    const testCases = [
      { move1: GameMove.ROCK, move2: GameMove.SCISSORS, expected: GameResult.PLAYER1_WIN },
      { move1: GameMove.PAPER, move2: GameMove.ROCK, expected: GameResult.PLAYER1_WIN },
      { move1: GameMove.SCISSORS, move2: GameMove.PAPER, expected: GameResult.PLAYER1_WIN },
      { move1: GameMove.SCISSORS, move2: GameMove.ROCK, expected: GameResult.PLAYER2_WIN },
      { move1: GameMove.ROCK, move2: GameMove.PAPER, expected: GameResult.PLAYER2_WIN },
      { move1: GameMove.PAPER, move2: GameMove.SCISSORS, expected: GameResult.PLAYER2_WIN },
      { move1: GameMove.ROCK, move2: GameMove.ROCK, expected: GameResult.DRAW },
      { move1: GameMove.PAPER, move2: GameMove.PAPER, expected: GameResult.DRAW },
      { move1: GameMove.SCISSORS, move2: GameMove.SCISSORS, expected: GameResult.DRAW },
    ];

    testCases.forEach(({ move1, move2, expected }) => {
      it(`should return ${expected} for ${move1} vs ${move2}`, () => {
        // Act
        const result = service.determineWinner(move1, move2);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe('validateGameMove', () => {
    it('should accept valid moves', () => {
      Object.values(GameMove).forEach(move => {
        expect(() => service.validateGameMove(move)).not.toThrow();
      });
    });

    it('should reject invalid moves', () => {
      const invalidMoves = ['INVALID', 'rock', 'STONE', null, undefined, 123];
      
      invalidMoves.forEach(move => {
        expect(() => service.validateGameMove(move as any)).toThrow('Invalid game move');
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const gameData = {
        matchId: 'match-id',
        player1Id: 'player1',
        player2Id: 'player2',
        player1Move: GameMove.ROCK,
        player2Move: GameMove.SCISSORS,
      };

      matchRepository.findOneBy.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(service.playGame(gameData)).rejects.toThrow('Failed to create game');
    });

    it('should log errors appropriately', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      const gameData = {
        matchId: 'match-id',
        player1Id: 'player1',
        player2Id: 'player2',
        player1Move: GameMove.ROCK,
        player2Move: GameMove.SCISSORS,
      };

      matchRepository.findOneBy.mockRejectedValue(new Error('Database error'));

      // Act
      try {
        await service.playGame(gameData);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to create game',
        expect.objectContaining({
          error: 'Database error',
          gameData,
        })
      );
    });
  });

  describe('concurrent games', () => {
    it('should handle multiple simultaneous games', async () => {
      // Arrange
      const match = TestDataFactory.createMatch();
      const players = TestDataFactory.createPlayers(4);
      
      const gamePromises = [
        { player1Id: players[0].id, player2Id: players[1].id, player1Move: GameMove.ROCK, player2Move: GameMove.SCISSORS },
        { player1Id: players[2].id, player2Id: players[3].id, player1Move: GameMove.PAPER, player2Move: GameMove.ROCK },
      ].map(gameData => ({
        matchId: match.id,
        ...gameData,
      }));

      matchRepository.findOneBy.mockResolvedValue(match);
      playerRepository.findOneBy.mockImplementation((criteria: any) =>
        Promise.resolve(players.find(p => p.id === criteria.id) || null)
      );
      gameRepository.create.mockImplementation((data: any) => ({ id: 'game-id', ...data }));
      gameRepository.save.mockImplementation((game: any) => Promise.resolve(game));

      // Act
      const results = await Promise.all(
        gamePromises.map(gameData => service.playGame(gameData))
      );

      // Assert
      expect(results).toHaveLength(2);
      expect(gameRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});