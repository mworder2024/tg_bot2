import { faker } from '@faker-js/faker';
import { Game, GameMove, GameResult, GameStatus, GameType } from '../../src/entities/game.entity';
import { User } from '../../src/entities/user.entity';
import { UserFactory } from './user.factory';

/**
 * Game Factory - Generate test games with realistic data
 */
export class GameFactory {
  /**
   * Create a basic game
   */
  static create(overrides: Partial<Game> = {}): Game {
    const game = new Game();
    
    game.id = overrides.id || faker.string.uuid();
    game.type = overrides.type || GameType.QUICK_MATCH;
    game.status = overrides.status || GameStatus.WAITING_FOR_PLAYERS;
    game.createdAt = overrides.createdAt || new Date();
    game.updatedAt = overrides.updatedAt || new Date();
    
    // Set players if provided
    if (overrides.player1) {
      game.player1 = overrides.player1;
    }
    if (overrides.player2) {
      game.player2 = overrides.player2;
    }
    
    return game;
  }

  /**
   * Create a game with two players
   */
  static createWithPlayers(player1?: User, player2?: User, overrides: Partial<Game> = {}): Game {
    const [p1, p2] = player1 && player2 ? [player1, player2] : UserFactory.createPlayerPair();
    
    return this.create({
      player1: p1,
      player2: p2,
      status: GameStatus.WAITING_FOR_MOVES,
      ...overrides,
    });
  }

  /**
   * Create a completed game with moves and result
   */
  static createCompleted(
    player1Move: GameMove = GameMove.ROCK,
    player2Move: GameMove = GameMove.SCISSORS,
    overrides: Partial<Game> = {}
  ): Game {
    const [player1, player2] = UserFactory.createPlayerPair();
    
    // Determine winner
    let result: GameResult;
    let winner: User | undefined;
    
    if (player1Move === player2Move) {
      result = GameResult.DRAW;
    } else if (
      (player1Move === GameMove.ROCK && player2Move === GameMove.SCISSORS) ||
      (player1Move === GameMove.PAPER && player2Move === GameMove.ROCK) ||
      (player1Move === GameMove.SCISSORS && player2Move === GameMove.PAPER)
    ) {
      result = GameResult.PLAYER1_WIN;
      winner = player1;
    } else {
      result = GameResult.PLAYER2_WIN;
      winner = player2;
    }
    
    return this.create({
      player1,
      player2,
      player1Move,
      player2Move,
      result,
      winner,
      status: GameStatus.COMPLETED,
      playedAt: new Date(),
      durationSeconds: faker.number.int({ min: 10, max: 300 }),
      ...overrides,
    });
  }

  /**
   * Create a game in progress (waiting for moves)
   */
  static createInProgress(overrides: Partial<Game> = {}): Game {
    return this.createWithPlayers(undefined, undefined, {
      status: GameStatus.WAITING_FOR_MOVES,
      startedAt: new Date(),
      ...overrides,
    });
  }

  /**
   * Create a tournament game
   */
  static createTournament(overrides: Partial<Game> = {}): Game {
    return this.createWithPlayers(undefined, undefined, {
      type: GameType.TOURNAMENT,
      ...overrides,
    });
  }

  /**
   * Create multiple games
   */
  static createMany(count: number, overrides: Partial<Game> = {}): Game[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create a series of completed games for statistics testing
   */
  static createGameSeries(player: User, gamesCount: number): Game[] {
    const games: Game[] = [];
    
    for (let i = 0; i < gamesCount; i++) {
      const opponent = UserFactory.create();
      const playerMove = faker.helpers.enumValue(GameMove);
      const opponentMove = faker.helpers.enumValue(GameMove);
      
      const game = this.createCompleted(playerMove, opponentMove, {
        player1: i % 2 === 0 ? player : opponent,
        player2: i % 2 === 0 ? opponent : player,
      });
      
      games.push(game);
    }
    
    return games;
  }
}