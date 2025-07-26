import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GameEngineService } from '../game-engine.service';
import { Game, GameMove, GameResult, GameStatus, GameType } from '../../entities/game.entity';
import { User } from '../../entities/user.entity';
import { UserStats } from '../../entities/user-stats.entity';
import { TestDataFactory } from '../../../test/factories/test-data-factory';

describe('GameEngineService', () => {
  let service: GameEngineService;
  let gameRepository: jest.Mocked<Repository<Game>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let userStatsRepository: jest.Mocked<Repository<UserStats>>;

  const mockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    })),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEngineService,
        {
          provide: getRepositoryToken(Game),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(UserStats),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GameEngineService>(GameEngineService);
    gameRepository = module.get(getRepositoryToken(Game));
    userRepository = module.get(getRepositoryToken(User));
    userStatsRepository = module.get(getRepositoryToken(UserStats));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuickMatch', () => {
    let player1: User;

    beforeEach(() => {
      player1 = TestDataFactory.createPlayer();
    });

    it('should create a quick match successfully', async () => {
      const mockGame = new Game();
      mockGame.id = 'game-id';
      mockGame.player1 = player1;
      mockGame.type = GameType.QUICK_MATCH;
      mockGame.status = GameStatus.WAITING_FOR_PLAYERS;

      userRepository.findOneBy.mockResolvedValue(player1);
      gameRepository.create.mockReturnValue(mockGame);
      gameRepository.save.mockResolvedValue(mockGame);

      const result = await service.createQuickMatch(player1.id);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: player1.id });
      expect(gameRepository.create).toHaveBeenCalledWith({
        type: GameType.QUICK_MATCH,
        status: GameStatus.WAITING_FOR_PLAYERS,
        player1,
        createdAt: expect.any(Date),
      });
      expect(gameRepository.save).toHaveBeenCalledWith(mockGame);
      expect(result).toBe(mockGame);
    });

    it('should throw NotFoundException when player not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.createQuickMatch('invalid-player-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error when user creation fails', async () => {
      userRepository.findOneBy.mockResolvedValue(player1);
      gameRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createQuickMatch(player1.id))
        .rejects.toThrow('Failed to create quick match');
    });
  });

  describe('joinGame', () => {
    let player1: User;
    let player2: User;
    let game: Game;

    beforeEach(() => {
      player1 = TestDataFactory.createPlayer();
      player2 = TestDataFactory.createPlayer();
      
      game = new Game();
      game.id = 'game-id';
      game.player1 = player1;
      game.status = GameStatus.WAITING_FOR_PLAYERS;
      game.type = GameType.QUICK_MATCH;
    });

    it('should join game successfully', async () => {
      userRepository.findOneBy.mockResolvedValue(player2);
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue({ ...game, player2, status: GameStatus.WAITING_FOR_MOVES });

      const result = await service.joinGame(game.id, player2.id);

      expect(gameRepository.findOne).toHaveBeenCalledWith({
        where: { id: game.id },
        relations: ['player1', 'player2'],
      });
      expect(result.player2).toBe(player2);
      expect(result.status).toBe(GameStatus.WAITING_FOR_MOVES);
    });

    it('should throw NotFoundException when game not found', async () => {
      gameRepository.findOne.mockResolvedValue(null);

      await expect(service.joinGame('invalid-game-id', player2.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when player not found', async () => {
      gameRepository.findOne.mockResolvedValue(game);
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.joinGame(game.id, 'invalid-player-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when game is full', async () => {
      game.player2 = player2;
      gameRepository.findOne.mockResolvedValue(game);
      userRepository.findOneBy.mockResolvedValue(player2);

      await expect(service.joinGame(game.id, player2.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when player tries to join own game', async () => {
      gameRepository.findOne.mockResolvedValue(game);
      userRepository.findOneBy.mockResolvedValue(player1);

      await expect(service.joinGame(game.id, player1.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('submitMove', () => {
    let player1: User;
    let player2: User;
    let game: Game;

    beforeEach(() => {
      player1 = TestDataFactory.createPlayer();
      player2 = TestDataFactory.createPlayer();
      
      game = new Game();
      game.id = 'game-id';
      game.player1 = player1;
      game.player2 = player2;
      game.status = GameStatus.WAITING_FOR_MOVES;
      game.timeoutAt = new Date(Date.now() + 60000);
    });

    it('should submit player1 move successfully', async () => {
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue({
        ...game,
        player1Move: GameMove.ROCK,
      });

      const result = await service.submitMove(game.id, player1.id, GameMove.ROCK);

      expect(result.player1Move).toBe(GameMove.ROCK);
      expect(result.status).toBe(GameStatus.WAITING_FOR_MOVES);
    });

    it('should complete game when both moves submitted', async () => {
      game.player1Move = GameMove.ROCK;
      gameRepository.findOne.mockResolvedValue(game);
      
      const completedGame = {
        ...game,
        player2Move: GameMove.SCISSORS,
        result: GameResult.PLAYER1_WIN,
        winner: player1,
        status: GameStatus.COMPLETED,
      };
      gameRepository.save.mockResolvedValue(completedGame);

      // Mock user stats update
      const player1Stats = new UserStats();
      const player2Stats = new UserStats();
      userStatsRepository.findOne
        .mockResolvedValueOnce(player1Stats)
        .mockResolvedValueOnce(player2Stats);
      userStatsRepository.save.mockResolvedValue(player1Stats);

      const result = await service.submitMove(game.id, player2.id, GameMove.SCISSORS);

      expect(result.status).toBe(GameStatus.COMPLETED);
      expect(result.result).toBe(GameResult.PLAYER1_WIN);
      expect(result.winner).toBe(player1);
    });

    it('should throw NotFoundException when game not found', async () => {
      gameRepository.findOne.mockResolvedValue(null);

      await expect(service.submitMove('invalid-game-id', player1.id, GameMove.ROCK))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid player', async () => {
      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.submitMove(game.id, 'invalid-player-id', GameMove.ROCK))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when game is not waiting for moves', async () => {
      game.status = GameStatus.COMPLETED;
      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.submitMove(game.id, player1.id, GameMove.ROCK))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when player already submitted move', async () => {
      game.player1Move = GameMove.ROCK;
      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.submitMove(game.id, player1.id, GameMove.PAPER))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when game has timed out', async () => {
      game.timeoutAt = new Date(Date.now() - 1000);
      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.submitMove(game.id, player1.id, GameMove.ROCK))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getGameById', () => {
    let game: Game;

    beforeEach(() => {
      game = TestDataFactory.createGame();
    });

    it('should return game when found', async () => {
      gameRepository.findOne.mockResolvedValue(game);

      const result = await service.getGameById(game.id);

      expect(gameRepository.findOne).toHaveBeenCalledWith({
        where: { id: game.id },
        relations: ['player1', 'player2', 'winner', 'tournament'],
      });
      expect(result).toBe(game);
    });

    it('should throw NotFoundException when game not found', async () => {
      gameRepository.findOne.mockResolvedValue(null);

      await expect(service.getGameById('invalid-game-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlayerGames', () => {
    let player: User;
    let games: Game[];

    beforeEach(() => {
      player = TestDataFactory.createPlayer();
      games = [
        TestDataFactory.createGame({ player1Id: player.id }),
        TestDataFactory.createGame({ player2Id: player.id }),
      ];
    });

    it('should return player games with default pagination', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(games),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPlayerGames(player.id);

      expect(queryBuilder.where).toHaveBeenCalledWith('game.player1 = :playerId', { playerId: player.id });
      expect(queryBuilder.orWhere).toHaveBeenCalledWith('game.player2 = :playerId', { playerId: player.id });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('game.createdAt', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
      expect(queryBuilder.offset).toHaveBeenCalledWith(0);
      expect(result).toBe(games);
    });

    it('should return player games with custom pagination', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(games),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getPlayerGames(player.id, 10, 20);

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
      expect(queryBuilder.offset).toHaveBeenCalledWith(20);
    });
  });

  describe('getPlayerStats', () => {
    let player: User;
    let games: Game[];

    beforeEach(() => {
      player = TestDataFactory.createPlayer();
      games = [
        TestDataFactory.createGame({
          player1Id: player.id,
          result: GameResult.PLAYER1_WIN,
          winnerId: player.id,
        }),
        TestDataFactory.createGame({
          player2Id: player.id,
          result: GameResult.PLAYER2_WIN,
          winnerId: 'other-player',
        }),
        TestDataFactory.createGame({
          player1Id: player.id,
          result: GameResult.DRAW,
        }),
      ];
    });

    it('should calculate player statistics correctly', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(games),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPlayerStats(player.id);

      expect(result).toEqual({
        totalGames: 3,
        wins: 1,
        losses: 1,
        draws: 1,
        winRate: 33.33,
        currentStreak: expect.any(Number),
        bestStreak: expect.any(Number),
        favoriteMove: expect.any(String),
        recentForm: expect.any(Array),
      });
    });

    it('should handle player with no games', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPlayerStats(player.id);

      expect(result).toEqual({
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        favoriteMove: null,
        recentForm: [],
      });
    });
  });

  describe('cancelGame', () => {
    let game: Game;

    beforeEach(() => {
      game = TestDataFactory.createGame();
      game.status = GameStatus.WAITING_FOR_MOVES;
    });

    it('should cancel game successfully', async () => {
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue({
        ...game,
        status: GameStatus.CANCELLED,
      });

      const result = await service.cancelGame(game.id, 'Player disconnected');

      expect(result.status).toBe(GameStatus.CANCELLED);
      expect(gameRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when game not found', async () => {
      gameRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelGame('invalid-game-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when game already completed', async () => {
      game.status = GameStatus.COMPLETED;
      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.cancelGame(game.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getActiveGames', () => {
    it('should return active games', async () => {
      const activeGames = [
        TestDataFactory.createGame({ status: GameStatus.WAITING_FOR_PLAYERS }),
        TestDataFactory.createGame({ status: GameStatus.WAITING_FOR_MOVES }),
      ];

      gameRepository.find.mockResolvedValue(activeGames);

      const result = await service.getActiveGames();

      expect(gameRepository.find).toHaveBeenCalledWith({
        where: [
          { status: GameStatus.WAITING_FOR_PLAYERS },
          { status: GameStatus.WAITING_FOR_MOVES },
        ],
        relations: ['player1', 'player2'],
        order: { createdAt: 'ASC' },
      });
      expect(result).toBe(activeGames);
    });
  });

  describe('handleGameTimeout', () => {
    let game: Game;

    beforeEach(() => {
      game = TestDataFactory.createGame();
      game.status = GameStatus.WAITING_FOR_MOVES;
      game.timeoutAt = new Date(Date.now() - 1000);
    });

    it('should handle game timeout', async () => {
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue({
        ...game,
        status: GameStatus.TIMEOUT,
      });

      const result = await service.handleGameTimeout(game.id);

      expect(result.status).toBe(GameStatus.TIMEOUT);
    });

    it('should throw NotFoundException when game not found', async () => {
      gameRepository.findOne.mockResolvedValue(null);

      await expect(service.handleGameTimeout('invalid-game-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Private Methods via Public Interface', () => {
    describe('updateUserStats (via completed game)', () => {
      let player1: User;
      let player2: User;
      let game: Game;

      beforeEach(() => {
        player1 = TestDataFactory.createPlayer();
        player2 = TestDataFactory.createPlayer();
        
        game = new Game();
        game.id = 'game-id';
        game.player1 = player1;
        game.player2 = player2;
        game.status = GameStatus.WAITING_FOR_MOVES;
        game.player1Move = GameMove.ROCK;
        game.timeoutAt = new Date(Date.now() + 60000);
      });

      it('should update user stats when game completes', async () => {
        gameRepository.findOne.mockResolvedValue(game);
        
        const completedGame = {
          ...game,
          player2Move: GameMove.SCISSORS,
          result: GameResult.PLAYER1_WIN,
          winner: player1,
          status: GameStatus.COMPLETED,
        };
        gameRepository.save.mockResolvedValue(completedGame);

        const player1Stats = new UserStats();
        const player2Stats = new UserStats();
        userStatsRepository.findOne
          .mockResolvedValueOnce(player1Stats)
          .mockResolvedValueOnce(player2Stats);
        userStatsRepository.save.mockResolvedValue(player1Stats);

        await service.submitMove(game.id, player2.id, GameMove.SCISSORS);

        expect(userStatsRepository.findOne).toHaveBeenCalledTimes(2);
        expect(userStatsRepository.save).toHaveBeenCalledTimes(2);
      });

      it('should create user stats if they do not exist', async () => {
        gameRepository.findOne.mockResolvedValue(game);
        
        const completedGame = {
          ...game,
          player2Move: GameMove.SCISSORS,
          result: GameResult.PLAYER1_WIN,
          winner: player1,
          status: GameStatus.COMPLETED,
        };
        gameRepository.save.mockResolvedValue(completedGame);

        userStatsRepository.findOne.mockResolvedValue(null);
        
        const newStats = new UserStats();
        userStatsRepository.create.mockReturnValue(newStats);
        userStatsRepository.save.mockResolvedValue(newStats);

        await service.submitMove(game.id, player2.id, GameMove.SCISSORS);

        expect(userStatsRepository.create).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      userRepository.findOneBy.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.createQuickMatch('player-id'))
        .rejects.toThrow('Failed to create quick match');
    });

    it('should handle concurrent access issues', async () => {
      const game = TestDataFactory.createGame();
      game.status = GameStatus.WAITING_FOR_MOVES;

      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockRejectedValue(new Error('Concurrent modification'));

      await expect(service.submitMove(game.id, 'player-id', GameMove.ROCK))
        .rejects.toThrow('Failed to submit move');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid move types', async () => {
      const game = TestDataFactory.createGame();
      game.status = GameStatus.WAITING_FOR_MOVES;
      game.timeoutAt = new Date(Date.now() + 60000);

      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.submitMove(game.id, 'player-id', 'INVALID_MOVE' as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle malformed game data', async () => {
      const game = new Game();
      game.id = 'game-id';
      // Missing required fields

      gameRepository.findOne.mockResolvedValue(game);

      await expect(service.getGameById(game.id))
        .rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent game operations', async () => {
      const games = Array.from({ length: 100 }, () => TestDataFactory.createGame());
      
      gameRepository.find.mockResolvedValue(games);

      const startTime = Date.now();
      const result = await service.getActiveGames();
      const endTime = Date.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});