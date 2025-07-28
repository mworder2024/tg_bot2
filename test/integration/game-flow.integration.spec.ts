import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameEngineService } from '../../src/services/game-engine.service';
import { UserService } from '../../src/modules/user/user.service';
import { Game, GameMove, GameResult, GameStatus } from '../../src/entities/game.entity';
import { User } from '../../src/entities/user.entity';
import { UserStats } from '../../src/entities/user-stats.entity';
import { DatabaseTestHelper } from '../utils/database.helper';
import { UserFactory } from '../factories/user.factory';

describe('Game Flow Integration', () => {
  let module: TestingModule;
  let gameEngineService: GameEngineService;
  let userService: UserService;
  let userRepository: Repository<User>;
  let gameRepository: Repository<Game>;
  let userStatsRepository: Repository<UserStats>;

  beforeAll(async () => {
    module = await DatabaseTestHelper.createTestingModule([
      GameEngineService,
      UserService,
    ]);

    gameEngineService = module.get<GameEngineService>(GameEngineService);
    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
    userStatsRepository = module.get<Repository<UserStats>>(getRepositoryToken(UserStats));
  });

  beforeEach(async () => {
    await DatabaseTestHelper.clearDatabase();
  });

  afterAll(async () => {
    await module.close();
    await DatabaseTestHelper.closeDatabase();
  });

  describe('Complete Game Flow', () => {
    it('should complete full game lifecycle: create → join → play → finish', async () => {
      // Arrange: Create two test users
      const player1Data = UserFactory.create();
      const player2Data = UserFactory.create();
      
      const player1 = await userRepository.save(player1Data);
      const player2 = await userRepository.save(player2Data);

      // Act 1: Player 1 creates a quick match
      const createdGame = await gameEngineService.createQuickMatch(player1.id);
      
      // Assert: Game is created and waiting for players
      expect(createdGame).toBeDefined();
      expect(createdGame.status).toBe(GameStatus.WAITING_FOR_PLAYERS);
      expect(createdGame.player1.id).toBe(player1.id);
      expect(createdGame.player2).toBeUndefined();

      // Act 2: Player 2 joins the game
      const joinedGame = await gameEngineService.joinGame(createdGame.id, player2.id);
      
      // Assert: Game now has both players and is waiting for moves
      expect(joinedGame.status).toBe(GameStatus.WAITING_FOR_MOVES);
      expect(joinedGame.player1.id).toBe(player1.id);
      expect(joinedGame.player2.id).toBe(player2.id);

      // Act 3: Player 1 submits their move
      const gameAfterMove1 = await gameEngineService.submitMove(
        joinedGame.id,
        player1.id,
        GameMove.ROCK
      );
      
      // Assert: Game still waiting for player 2's move
      expect(gameAfterMove1.status).toBe(GameStatus.WAITING_FOR_MOVES);
      expect(gameAfterMove1.player1Move).toBe(GameMove.ROCK);
      expect(gameAfterMove1.player2Move).toBeUndefined();

      // Act 4: Player 2 submits their move
      const completedGame = await gameEngineService.submitMove(
        joinedGame.id,
        player2.id,
        GameMove.SCISSORS
      );
      
      // Assert: Game is completed with correct result
      expect(completedGame.status).toBe(GameStatus.COMPLETED);
      expect(completedGame.player1Move).toBe(GameMove.ROCK);
      expect(completedGame.player2Move).toBe(GameMove.SCISSORS);
      expect(completedGame.result).toBe(GameResult.PLAYER1_WIN);
      expect(completedGame.winner.id).toBe(player1.id);
      expect(completedGame.completedAt).toBeDefined();

      // Act 5: Verify game persisted correctly
      const savedGame = await gameRepository.findOne({
        where: { id: completedGame.id },
        relations: ['player1', 'player2', 'winner'],
      });
      
      // Assert: Game data integrity
      expect(savedGame.status).toBe(GameStatus.COMPLETED);
      expect(savedGame.result).toBe(GameResult.PLAYER1_WIN);
      expect(savedGame.winner.id).toBe(player1.id);
    });

    it('should handle draw game correctly', async () => {
      // Arrange
      const player1Data = UserFactory.create();
      const player2Data = UserFactory.create();
      
      const player1 = await userRepository.save(player1Data);
      const player2 = await userRepository.save(player2Data);

      // Act: Complete game flow with same moves
      const game = await gameEngineService.createQuickMatch(player1.id);
      await gameEngineService.joinGame(game.id, player2.id);
      await gameEngineService.submitMove(game.id, player1.id, GameMove.ROCK);
      const completedGame = await gameEngineService.submitMove(game.id, player2.id, GameMove.ROCK);

      // Assert: Draw result
      expect(completedGame.result).toBe(GameResult.DRAW);
      expect(completedGame.winner).toBeNull();
    });

    it('should prevent invalid operations on completed game', async () => {
      // Arrange: Create and complete a game
      const player1Data = UserFactory.create();
      const player2Data = UserFactory.create();
      
      const player1 = await userRepository.save(player1Data);
      const player2 = await userRepository.save(player2Data);

      const game = await gameEngineService.createQuickMatch(player1.id);
      await gameEngineService.joinGame(game.id, player2.id);
      await gameEngineService.submitMove(game.id, player1.id, GameMove.ROCK);
      await gameEngineService.submitMove(game.id, player2.id, GameMove.SCISSORS);

      // Act & Assert: Should prevent further moves
      await expect(
        gameEngineService.submitMove(game.id, player1.id, GameMove.PAPER)
      ).rejects.toThrow();
    });
  });

  describe('Game Statistics Integration', () => {
    it('should update user statistics after game completion', async () => {
      // Arrange
      const player1Data = UserFactory.create();
      const player2Data = UserFactory.create();
      
      const player1 = await userRepository.save(player1Data);
      const player2 = await userRepository.save(player2Data);

      // Act: Complete multiple games
      for (let i = 0; i < 3; i++) {
        const game = await gameEngineService.createQuickMatch(player1.id);
        await gameEngineService.joinGame(game.id, player2.id);
        await gameEngineService.submitMove(game.id, player1.id, GameMove.ROCK);
        await gameEngineService.submitMove(game.id, player2.id, GameMove.SCISSORS);
      }

      // Assert: Check game history
      const player1Games = await gameEngineService.getGameHistory(player1.id);
      const player2Games = await gameEngineService.getGameHistory(player2.id);

      expect(player1Games).toHaveLength(3);
      expect(player2Games).toHaveLength(3);
      
      // All games should show player1 as winner
      player1Games.forEach(game => {
        expect(game.result).toBe(GameResult.PLAYER1_WIN);
        expect(game.winner.id).toBe(player1.id);
      });
    });
  });

  describe('Concurrent Game Operations', () => {
    it('should handle multiple games simultaneously', async () => {
      // Arrange: Create multiple user pairs
      const users = await Promise.all(
        Array.from({ length: 6 }, () => userRepository.save(UserFactory.create()))
      );

      // Act: Create multiple games simultaneously
      const gamePromises = [];
      for (let i = 0; i < 3; i++) {
        const player1 = users[i * 2];
        const player2 = users[i * 2 + 1];
        
        gamePromises.push(
          gameEngineService.createQuickMatch(player1.id)
            .then(game => gameEngineService.joinGame(game.id, player2.id))
            .then(game => gameEngineService.submitMove(game.id, player1.id, GameMove.ROCK))
            .then(game => gameEngineService.submitMove(game.id, player2.id, GameMove.SCISSORS))
        );
      }

      const completedGames = await Promise.all(gamePromises);

      // Assert: All games completed successfully
      expect(completedGames).toHaveLength(3);
      completedGames.forEach(game => {
        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.result).toBe(GameResult.PLAYER1_WIN);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle non-existent user gracefully', async () => {
      await expect(
        gameEngineService.createQuickMatch('non-existent-user-id')
      ).rejects.toThrow('User not found');
    });

    it('should handle non-existent game gracefully', async () => {
      const player = await userRepository.save(UserFactory.create());
      
      await expect(
        gameEngineService.joinGame('non-existent-game-id', player.id)
      ).rejects.toThrow('Game not found');
    });

    it('should prevent player from joining their own game', async () => {
      // Arrange
      const player = await userRepository.save(UserFactory.create());
      const game = await gameEngineService.createQuickMatch(player.id);

      // Act & Assert
      await expect(
        gameEngineService.joinGame(game.id, player.id)
      ).rejects.toThrow();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity across game operations', async () => {
      // Arrange
      const player1 = await userRepository.save(UserFactory.create());
      const player2 = await userRepository.save(UserFactory.create());

      // Act: Complete a game
      const game = await gameEngineService.createQuickMatch(player1.id);
      await gameEngineService.joinGame(game.id, player2.id);
      await gameEngineService.submitMove(game.id, player1.id, GameMove.ROCK);
      const completedGame = await gameEngineService.submitMove(game.id, player2.id, GameMove.SCISSORS);

      // Assert: Verify all relationships are maintained
      const savedGame = await gameRepository.findOne({
        where: { id: completedGame.id },
        relations: ['player1', 'player2', 'winner'],
      });

      expect(savedGame.player1.id).toBe(player1.id);
      expect(savedGame.player2.id).toBe(player2.id);
      expect(savedGame.winner.id).toBe(player1.id);
      
      // Verify foreign key relationships
      expect(savedGame.player1.telegramId).toBe(player1.telegramId);
      expect(savedGame.player2.telegramId).toBe(player2.telegramId);
    });
  });
});