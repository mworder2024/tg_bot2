import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameEngineService } from '../game-engine.service';
import { Game, GameMove, GameResult, GameStatus, GameType } from '../../entities/game.entity';
import { User } from '../../entities/user.entity';
import { UserStats } from '../../entities/user-stats.entity';
import { UserFactory } from '../../../test/factories/user.factory';
import { GameFactory } from '../../../test/factories/game.factory';

describe('GameEngineService', () => {
  let service: GameEngineService;
  let gameRepository: jest.Mocked<Repository<Game>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let userStatsRepository: jest.Mocked<Repository<UserStats>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEngineService,
        {
          provide: getRepositoryToken(Game),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              offset: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserStats),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
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
    it('should create a new quick match game', async () => {
      // Arrange
      const player = UserFactory.create();
      const newGame = GameFactory.create({
        player1: player,
        type: GameType.QUICK_MATCH,
        status: GameStatus.WAITING_FOR_PLAYERS,
      });

      userRepository.findOneBy.mockResolvedValue(player);
      gameRepository.create.mockReturnValue(newGame);
      gameRepository.save.mockResolvedValue(newGame);

      // Act
      const result = await service.createQuickMatch(player.id);

      // Assert
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: player.id });
      expect(gameRepository.create).toHaveBeenCalledWith({
        type: GameType.QUICK_MATCH,
        status: GameStatus.WAITING_FOR_PLAYERS,
        player1: player,
        createdAt: expect.any(Date),
      });
      expect(gameRepository.save).toHaveBeenCalledWith(newGame);
      expect(result).toBe(newGame);
    });

    it('should throw NotFoundException when player does not exist', async () => {
      // Arrange
      const playerId = 'non-existent-id';
      userRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createQuickMatch(playerId)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: playerId });
    });
  });

  describe('submitMove', () => {
    it('should submit player move successfully', async () => {
      // Arrange
      const [player1, player2] = UserFactory.createPlayerPair();
      const game = GameFactory.createWithPlayers(player1, player2);
      
      // Mock the game methods
      game.submitMove = jest.fn();
      
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue(game);

      // Mock static method
      Game.validateMove = jest.fn().mockReturnValue(true);

      // Act
      const result = await service.submitMove(game.id, player1.id, GameMove.ROCK);

      // Assert
      expect(gameRepository.findOne).toHaveBeenCalledWith({
        where: { id: game.id },
        relations: ['player1', 'player2', 'winner'],
      });
      expect(game.submitMove).toHaveBeenCalledWith(player1.id, GameMove.ROCK);
      expect(result).toBe(game);
    });

    it('should throw BadRequestException for invalid move', async () => {
      // Arrange
      const [player1, player2] = UserFactory.createPlayerPair();
      const game = GameFactory.createWithPlayers(player1, player2);
      
      // Mock static method to return false for invalid move
      Game.validateMove = jest.fn().mockReturnValue(false);

      // Act & Assert
      await expect(
        service.submitMove(game.id, player1.id, 'INVALID_MOVE' as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinGame', () => {
    it('should allow player to join an available game', async () => {
      // Arrange
      const player1 = UserFactory.create();
      const player2 = UserFactory.create();
      const game = GameFactory.create({
        player1,
        status: GameStatus.WAITING_FOR_PLAYERS,
      });

      // Mock game methods
      game.addPlayer2 = jest.fn();

      userRepository.findOneBy.mockResolvedValue(player2);
      gameRepository.findOne.mockResolvedValue(game);
      gameRepository.save.mockResolvedValue(game);

      // Act
      const result = await service.joinGame(game.id, player2.id);

      // Assert
      expect(game.addPlayer2).toHaveBeenCalledWith(player2);
      expect(result).toBe(game);
    });

    it('should throw BadRequestException when game is full', async () => {
      // Arrange
      const [player1, player2] = UserFactory.createPlayerPair();
      const player3 = UserFactory.create();
      const game = GameFactory.createWithPlayers(player1, player2);

      userRepository.findOneBy.mockResolvedValue(player3);
      gameRepository.findOne.mockResolvedValue(game);

      // Act & Assert
      await expect(service.joinGame(game.id, player3.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlayerGames', () => {
    it('should return user game history', async () => {
      // Arrange
      const user = UserFactory.create();
      const games = GameFactory.createGameSeries(user, 5);

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(games),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getPlayerGames(user.id);

      // Assert
      expect(gameRepository.createQueryBuilder).toHaveBeenCalledWith('game');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('game.player1', 'player1');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('game.player2', 'player2');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('game.winner', 'winner');
      expect(queryBuilder.where).toHaveBeenCalledWith('game.player1 = :playerId', { playerId: user.id });
      expect(queryBuilder.orWhere).toHaveBeenCalledWith('game.player2 = :playerId', { playerId: user.id });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('game.createdAt', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
      expect(queryBuilder.offset).toHaveBeenCalledWith(0);
      expect(result).toBe(games);
    });

    it('should limit results to specified count', async () => {
      // Arrange
      const user = UserFactory.create();
      const limit = 10;

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      gameRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getPlayerGames(user.id, limit);

      // Assert
      expect(queryBuilder.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('getGameById', () => {
    it('should return game when found', async () => {
      // Arrange
      const game = GameFactory.create();
      gameRepository.findOne.mockResolvedValue(game);

      // Act
      const result = await service.getGameById(game.id);

      // Assert
      expect(gameRepository.findOne).toHaveBeenCalledWith({
        where: { id: game.id },
        relations: ['player1', 'player2', 'winner'],
      });
      expect(result).toBe(game);
    });

    it('should throw NotFoundException when game not found', async () => {
      // Arrange
      gameRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getGameById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});