import { faker } from '@faker-js/faker';

// Interfaces (these would normally be imported from your domain)
export interface Player {
  id: string;
  telegramId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  wins: number;
  losses: number;
  rating: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  maxPlayers: number;
  currentPlayers: number;
  status: TournamentStatus;
  format: TournamentFormat;
  startedAt?: Date;
  endedAt?: Date;
  winnerId?: string;
  players: Player[];
  matches: Match[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  id: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  player1Move?: GameMove;
  player2Move?: GameMove;
  winnerId?: string;
  status: MatchStatus;
  round: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface Game {
  id: string;
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Move: GameMove;
  player2Move: GameMove;
  winnerId?: string;
  result: GameResult;
  playedAt: Date;
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum MatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GameMove {
  ROCK = 'ROCK',
  PAPER = 'PAPER',
  SCISSORS = 'SCISSORS',
}

export enum GameResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  DRAW = 'DRAW',
}

/**
 * Test Data Factory for creating mock data objects
 */
export class TestDataFactory {
  /**
   * Create a mock player with optional overrides
   */
  static createPlayer(overrides: Partial<Player> = {}): Player {
    const telegramId = faker.number.int({ min: 100000, max: 999999999 });
    const username = faker.internet.userName();
    
    return {
      id: faker.string.uuid(),
      telegramId,
      username,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      wins: faker.number.int({ min: 0, max: 100 }),
      losses: faker.number.int({ min: 0, max: 100 }),
      rating: faker.number.int({ min: 800, max: 2000 }),
      isActive: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create multiple mock players
   */
  static createPlayers(count: number, overrides: Partial<Player> = {}): Player[] {
    return Array.from({ length: count }, () => this.createPlayer(overrides));
  }

  /**
   * Create a mock tournament with optional overrides
   */
  static createTournament(overrides: Partial<Tournament> = {}): Tournament {
    const maxPlayers = overrides.maxPlayers || 8;
    const currentPlayers = overrides.currentPlayers || 0;
    
    return {
      id: faker.string.uuid(),
      name: `${faker.lorem.words(2)} Tournament`,
      description: faker.lorem.sentence(),
      maxPlayers,
      currentPlayers,
      status: TournamentStatus.REGISTRATION,
      format: TournamentFormat.SINGLE_ELIMINATION,
      players: [],
      matches: [],
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create a tournament with players
   */
  static createTournamentWithPlayers(
    playerCount: number,
    tournamentOverrides: Partial<Tournament> = {}
  ): Tournament {
    const players = this.createPlayers(playerCount);
    
    return this.createTournament({
      maxPlayers: Math.max(playerCount, 8),
      currentPlayers: playerCount,
      players,
      ...tournamentOverrides,
    });
  }

  /**
   * Create a mock match with optional overrides
   */
  static createMatch(overrides: Partial<Match> = {}): Match {
    return {
      id: faker.string.uuid(),
      tournamentId: faker.string.uuid(),
      player1Id: faker.string.uuid(),
      player2Id: faker.string.uuid(),
      status: MatchStatus.PENDING,
      round: 1,
      startedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create a mock game with optional overrides
   */
  static createGame(overrides: Partial<Game> = {}): Game {
    const moves = [GameMove.ROCK, GameMove.PAPER, GameMove.SCISSORS];
    const player1Move = faker.helpers.arrayElement(moves);
    const player2Move = faker.helpers.arrayElement(moves);
    
    const result = this.calculateGameResult(player1Move, player2Move);
    
    return {
      id: faker.string.uuid(),
      matchId: faker.string.uuid(),
      player1Id: faker.string.uuid(),
      player2Id: faker.string.uuid(),
      player1Move,
      player2Move,
      result,
      winnerId: result === GameResult.PLAYER1_WIN ? 'player1' : 
               result === GameResult.PLAYER2_WIN ? 'player2' : undefined,
      playedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create a complete tournament scenario
   */
  static createCompleteTournamentScenario(): {
    tournament: Tournament;
    players: Player[];
    matches: Match[];
    games: Game[];
  } {
    const players = this.createPlayers(8);
    const tournament = this.createTournament({
      maxPlayers: 8,
      currentPlayers: 8,
      players,
      status: TournamentStatus.ACTIVE,
    });

    // Create bracket matches for single elimination
    const matches: Match[] = [];
    const games: Game[] = [];

    // First round (4 matches)
    for (let i = 0; i < 4; i++) {
      const match = this.createMatch({
        tournamentId: tournament.id,
        player1Id: players[i * 2].id,
        player2Id: players[i * 2 + 1].id,
        round: 1,
        status: MatchStatus.COMPLETED,
      });
      matches.push(match);

      const game = this.createGame({
        matchId: match.id,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
      });
      games.push(game);

      // Set match winner based on game result
      match.winnerId = game.winnerId;
    }

    return { tournament, players, matches, games };
  }

  /**
   * Create test data for performance testing
   */
  static createLargeDataset(config: {
    playerCount?: number;
    tournamentCount?: number;
    matchCount?: number;
  } = {}): {
    players: Player[];
    tournaments: Tournament[];
    matches: Match[];
  } {
    const {
      playerCount = 1000,
      tournamentCount = 100,
      matchCount = 500,
    } = config;

    const players = this.createPlayers(playerCount);
    const tournaments = Array.from({ length: tournamentCount }, () =>
      this.createTournament()
    );
    const matches = Array.from({ length: matchCount }, () =>
      this.createMatch({
        tournamentId: faker.helpers.arrayElement(tournaments).id,
        player1Id: faker.helpers.arrayElement(players).id,
        player2Id: faker.helpers.arrayElement(players).id,
      })
    );

    return { players, tournaments, matches };
  }

  /**
   * Create mock Telegram message data
   */
  static createTelegramMessage(overrides: any = {}): any {
    return {
      message_id: faker.number.int({ min: 1, max: 999999 }),
      from: {
        id: faker.number.int({ min: 100000, max: 999999999 }),
        is_bot: false,
        first_name: faker.person.firstName(),
        username: faker.internet.userName(),
        language_code: 'en',
      },
      chat: {
        id: faker.number.int({ min: 100000, max: 999999999 }),
        first_name: faker.person.firstName(),
        username: faker.internet.userName(),
        type: 'private',
      },
      date: Math.floor(Date.now() / 1000),
      text: '/start',
      ...overrides,
    };
  }

  /**
   * Create mock Telegram callback query
   */
  static createCallbackQuery(overrides: any = {}): any {
    return {
      id: faker.string.uuid(),
      from: {
        id: faker.number.int({ min: 100000, max: 999999999 }),
        is_bot: false,
        first_name: faker.person.firstName(),
        username: faker.internet.userName(),
      },
      message: this.createTelegramMessage(),
      data: 'join_tournament',
      ...overrides,
    };
  }

  /**
   * Calculate game result based on moves
   */
  private static calculateGameResult(move1: GameMove, move2: GameMove): GameResult {
    if (move1 === move2) {
      return GameResult.DRAW;
    }

    const winConditions = {
      [GameMove.ROCK]: GameMove.SCISSORS,
      [GameMove.PAPER]: GameMove.ROCK,
      [GameMove.SCISSORS]: GameMove.PAPER,
    };

    return winConditions[move1] === move2 ? GameResult.PLAYER1_WIN : GameResult.PLAYER2_WIN;
  }
}

/**
 * Predefined test scenarios
 */
export const TestScenarios = {
  // Empty tournament
  emptyTournament: () => TestDataFactory.createTournament({
    currentPlayers: 0,
    players: [],
    status: TournamentStatus.REGISTRATION,
  }),

  // Full tournament ready to start
  fullTournament: () => TestDataFactory.createTournamentWithPlayers(8, {
    status: TournamentStatus.REGISTRATION,
  }),

  // Active tournament in progress
  activeTournament: () => TestDataFactory.createTournamentWithPlayers(8, {
    status: TournamentStatus.ACTIVE,
    startedAt: faker.date.recent(),
  }),

  // Completed tournament
  completedTournament: () => TestDataFactory.createTournamentWithPlayers(8, {
    status: TournamentStatus.COMPLETED,
    startedAt: faker.date.past(),
    endedAt: faker.date.recent(),
    winnerId: faker.string.uuid(),
  }),

  // New player
  newPlayer: () => TestDataFactory.createPlayer({
    wins: 0,
    losses: 0,
    rating: 1000,
  }),

  // Experienced player
  experiencedPlayer: () => TestDataFactory.createPlayer({
    wins: faker.number.int({ min: 50, max: 200 }),
    losses: faker.number.int({ min: 20, max: 100 }),
    rating: faker.number.int({ min: 1200, max: 1800 }),
  }),

  // Champion player
  championPlayer: () => TestDataFactory.createPlayer({
    wins: faker.number.int({ min: 200, max: 500 }),
    losses: faker.number.int({ min: 10, max: 50 }),
    rating: faker.number.int({ min: 1800, max: 2000 }),
  }),
};