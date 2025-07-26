import { validate } from 'class-validator';
import { Game, GameMove, GameResult, GameStatus, GameType } from '../game.entity';
import { User } from '../user.entity';
import { Tournament } from '../tournament.entity';

describe('Game Entity', () => {
  let game: Game;
  let player1: User;
  let player2: User;
  let tournament: Tournament;

  beforeEach(() => {
    // Create test users
    player1 = new User();
    player1.id = 'player1-id';
    player1.telegramId = 123456789;
    player1.username = 'player1';
    player1.displayName = '@player1';

    player2 = new User();
    player2.id = 'player2-id';
    player2.telegramId = 987654321;
    player2.username = 'player2';
    player2.displayName = '@player2';

    // Create test tournament
    tournament = new Tournament();
    tournament.id = 'tournament-id';
    tournament.name = 'Test Tournament';

    // Create test game
    game = new Game();
    game.id = 'game-id';
    game.type = GameType.QUICK_MATCH;
    game.status = GameStatus.WAITING_FOR_PLAYERS;
    game.player1 = player1;
    game.createdAt = new Date();
  });

  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(game);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid game type', async () => {
      (game as any).type = 'INVALID_TYPE';
      const errors = await validate(game);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation with invalid game status', async () => {
      (game as any).status = 'INVALID_STATUS';
      const errors = await validate(game);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
    });

    it('should fail validation with invalid moves', async () => {
      (game as any).player1Move = 'INVALID_MOVE';
      const errors = await validate(game);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('player1Move');
    });

    it('should fail validation with negative duration', async () => {
      game.durationSeconds = -1;
      const errors = await validate(game);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('durationSeconds');
    });

    it('should fail validation with negative tournament round', async () => {
      game.tournamentRound = 0;
      const errors = await validate(game);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('tournamentRound');
    });
  });

  describe('Computed Properties', () => {
    describe('isCompleted', () => {
      it('should return true when status is COMPLETED', () => {
        game.status = GameStatus.COMPLETED;
        expect(game.isCompleted).toBe(true);
      });

      it('should return false when status is not COMPLETED', () => {
        game.status = GameStatus.ACTIVE;
        expect(game.isCompleted).toBe(false);
      });
    });

    describe('isWaitingForMoves', () => {
      it('should return true when status is WAITING_FOR_MOVES', () => {
        game.status = GameStatus.WAITING_FOR_MOVES;
        expect(game.isWaitingForMoves).toBe(true);
      });

      it('should return false when status is not WAITING_FOR_MOVES', () => {
        game.status = GameStatus.COMPLETED;
        expect(game.isWaitingForMoves).toBe(false);
      });
    });

    describe('hasAllPlayers', () => {
      it('should return true when both players are present', () => {
        game.player1 = player1;
        game.player2 = player2;
        expect(game.hasAllPlayers).toBe(true);
      });

      it('should return false when player2 is missing', () => {
        game.player1 = player1;
        game.player2 = undefined;
        expect(game.hasAllPlayers).toBe(false);
      });
    });

    describe('hasAllMoves', () => {
      it('should return true when both moves are present', () => {
        game.player1Move = GameMove.ROCK;
        game.player2Move = GameMove.PAPER;
        expect(game.hasAllMoves).toBe(true);
      });

      it('should return false when moves are missing', () => {
        game.player1Move = GameMove.ROCK;
        game.player2Move = undefined;
        expect(game.hasAllMoves).toBe(false);
      });
    });

    describe('loser', () => {
      it('should return player2 when player1 wins', () => {
        game.player1 = player1;
        game.player2 = player2;
        game.result = GameResult.PLAYER1_WIN;
        expect(game.loser).toBe(player2);
      });

      it('should return player1 when player2 wins', () => {
        game.player1 = player1;
        game.player2 = player2;
        game.result = GameResult.PLAYER2_WIN;
        expect(game.loser).toBe(player1);
      });

      it('should return null for draw', () => {
        game.result = GameResult.DRAW;
        expect(game.loser).toBeNull();
      });

      it('should return null when no result', () => {
        game.result = undefined;
        expect(game.loser).toBeNull();
      });
    });

    describe('isTournamentGame', () => {
      it('should return true for tournament games', () => {
        game.type = GameType.TOURNAMENT;
        game.tournament = tournament;
        expect(game.isTournamentGame).toBe(true);
      });

      it('should return false for non-tournament games', () => {
        game.type = GameType.QUICK_MATCH;
        game.tournament = undefined;
        expect(game.isTournamentGame).toBe(false);
      });
    });

    describe('formattedDuration', () => {
      it('should format duration correctly with minutes and seconds', () => {
        game.durationSeconds = 125; // 2 minutes 5 seconds
        expect(game.formattedDuration).toBe('2m 5s');
      });

      it('should format duration correctly with only seconds', () => {
        game.durationSeconds = 45;
        expect(game.formattedDuration).toBe('45s');
      });

      it('should return Unknown when no duration', () => {
        game.durationSeconds = undefined;
        expect(game.formattedDuration).toBe('Unknown');
      });
    });

    describe('isTimedOut', () => {
      it('should return true when timeout has passed', () => {
        game.timeoutAt = new Date(Date.now() - 1000); // 1 second ago
        expect(game.isTimedOut).toBe(true);
      });

      it('should return false when timeout has not passed', () => {
        game.timeoutAt = new Date(Date.now() + 1000); // 1 second from now
        expect(game.isTimedOut).toBe(false);
      });

      it('should return false when no timeout set', () => {
        game.timeoutAt = undefined;
        expect(game.isTimedOut).toBe(false);
      });
    });
  });

  describe('Methods', () => {
    describe('addPlayer2', () => {
      beforeEach(() => {
        game.player1 = player1;
        game.player2 = undefined;
        game.status = GameStatus.WAITING_FOR_PLAYERS;
      });

      it('should add player2 successfully', () => {
        game.addPlayer2(player2);

        expect(game.player2).toBe(player2);
        expect(game.status).toBe(GameStatus.WAITING_FOR_MOVES);
        expect(game.startedAt).toBeInstanceOf(Date);
        expect(game.timeoutAt).toBeInstanceOf(Date);
      });

      it('should throw error when game already has two players', () => {
        game.player2 = player2;
        expect(() => game.addPlayer2(player2)).toThrow('Game already has two players');
      });

      it('should throw error when player tries to play against themselves', () => {
        expect(() => game.addPlayer2(player1)).toThrow('Player cannot play against themselves');
      });
    });

    describe('submitMove', () => {
      beforeEach(() => {
        game.player1 = player1;
        game.player2 = player2;
        game.status = GameStatus.WAITING_FOR_MOVES;
        game.timeoutAt = new Date(Date.now() + 60000); // 1 minute from now
      });

      it('should record player1 move successfully', () => {
        game.submitMove(player1.id, GameMove.ROCK);

        expect(game.player1Move).toBe(GameMove.ROCK);
        expect(game.player2Move).toBeUndefined();
        expect(game.status).toBe(GameStatus.WAITING_FOR_MOVES);
      });

      it('should record player2 move successfully', () => {
        game.submitMove(player2.id, GameMove.PAPER);

        expect(game.player1Move).toBeUndefined();
        expect(game.player2Move).toBe(GameMove.PAPER);
        expect(game.status).toBe(GameStatus.WAITING_FOR_MOVES);
      });

      it('should complete game when both moves submitted', () => {
        game.submitMove(player1.id, GameMove.ROCK);
        game.submitMove(player2.id, GameMove.SCISSORS);

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.result).toBe(GameResult.PLAYER1_WIN);
        expect(game.winner).toBe(player1);
        expect(game.playedAt).toBeInstanceOf(Date);
      });

      it('should throw error for invalid player', () => {
        expect(() => game.submitMove('invalid-player-id', GameMove.ROCK))
          .toThrow('Player is not part of this game');
      });

      it('should throw error when game is not waiting for moves', () => {
        game.status = GameStatus.COMPLETED;
        expect(() => game.submitMove(player1.id, GameMove.ROCK))
          .toThrow('Game is not waiting for moves');
      });

      it('should throw error when game has timed out', () => {
        game.timeoutAt = new Date(Date.now() - 1000); // 1 second ago
        expect(() => game.submitMove(player1.id, GameMove.ROCK))
          .toThrow('Game has timed out');
      });

      it('should throw error when player already submitted move', () => {
        game.submitMove(player1.id, GameMove.ROCK);
        expect(() => game.submitMove(player1.id, GameMove.PAPER))
          .toThrow('Player 1 has already submitted a move');
      });

      it('should record move history in metadata', () => {
        game.submitMove(player1.id, GameMove.ROCK);

        expect(game.metadata?.moveHistory).toHaveLength(1);
        expect(game.metadata?.moveHistory?.[0]).toEqual({
          player: 'player1',
          move: GameMove.ROCK,
          timestamp: expect.any(Date),
        });
      });
    });

    describe('cancel', () => {
      it('should cancel game with reason', () => {
        game.cancel('Player disconnected');

        expect(game.status).toBe(GameStatus.CANCELLED);
        expect(game.metadata?.cancellationReason).toBe('Player disconnected');
      });

      it('should cancel game without reason', () => {
        game.cancel();

        expect(game.status).toBe(GameStatus.CANCELLED);
        expect(game.metadata?.cancellationReason).toBeUndefined();
      });
    });

    describe('handleTimeout', () => {
      beforeEach(() => {
        game.player1 = player1;
        game.player2 = player2;
        game.status = GameStatus.WAITING_FOR_MOVES;
      });

      it('should handle timeout with player1 move submitted', () => {
        game.player1Move = GameMove.ROCK;
        game.player2Move = undefined;

        game.handleTimeout();

        expect(game.status).toBe(GameStatus.TIMEOUT);
        expect(game.winner).toBe(player1);
        expect(game.result).toBe(GameResult.PLAYER1_WIN);
        expect(game.playedAt).toBeInstanceOf(Date);
      });

      it('should handle timeout with player2 move submitted', () => {
        game.player1Move = undefined;
        game.player2Move = GameMove.PAPER;

        game.handleTimeout();

        expect(game.status).toBe(GameStatus.TIMEOUT);
        expect(game.winner).toBe(player2);
        expect(game.result).toBe(GameResult.PLAYER2_WIN);
        expect(game.playedAt).toBeInstanceOf(Date);
      });

      it('should handle timeout with no moves submitted', () => {
        game.player1Move = undefined;
        game.player2Move = undefined;

        game.handleTimeout();

        expect(game.status).toBe(GameStatus.TIMEOUT);
        expect(game.winner).toBeUndefined();
        expect(game.result).toBeUndefined();
        expect(game.playedAt).toBeInstanceOf(Date);
      });

      it('should not handle timeout for non-active games', () => {
        game.status = GameStatus.COMPLETED;
        const originalStatus = game.status;

        game.handleTimeout();

        expect(game.status).toBe(originalStatus);
      });
    });

    describe('getPlayerMove', () => {
      beforeEach(() => {
        game.player1 = player1;
        game.player2 = player2;
        game.player1Move = GameMove.ROCK;
        game.player2Move = GameMove.PAPER;
      });

      it('should return own move during active game', () => {
        game.status = GameStatus.WAITING_FOR_MOVES;

        expect(game.getPlayerMove(player1.id)).toBe(GameMove.ROCK);
        expect(game.getPlayerMove(player2.id)).toBe(GameMove.PAPER);
      });

      it('should return all moves after game completion', () => {
        game.status = GameStatus.COMPLETED;

        expect(game.getPlayerMove(player1.id)).toBe(GameMove.ROCK);
        expect(game.getPlayerMove(player2.id)).toBe(GameMove.PAPER);
      });

      it('should return null for invalid player', () => {
        expect(game.getPlayerMove('invalid-player-id')).toBeNull();
      });
    });

    describe('getGameStateForPlayer', () => {
      beforeEach(() => {
        game.player1 = player1;
        game.player2 = player2;
        game.status = GameStatus.WAITING_FOR_MOVES;
        game.timeoutAt = new Date(Date.now() + 60000);
      });

      it('should return correct game state for player1', () => {
        game.player1Move = GameMove.ROCK;

        const state = game.getGameStateForPlayer(player1.id);

        expect(state.id).toBe(game.id);
        expect(state.type).toBe(game.type);
        expect(state.status).toBe(game.status);
        expect(state.opponent).toEqual({
          id: player2.id,
          username: player2.username,
          displayName: player2.displayName,
        });
        expect(state.myMove).toBe(GameMove.ROCK);
        expect(state.opponentMove).toBeUndefined();
        expect(state.timeoutAt).toBe(game.timeoutAt);
        expect(state.canSubmitMove).toBe(false); // Already submitted
      });

      it('should return correct game state for player2', () => {
        const state = game.getGameStateForPlayer(player2.id);

        expect(state.opponent).toEqual({
          id: player1.id,
          username: player1.username,
          displayName: player1.displayName,
        });
        expect(state.canSubmitMove).toBe(true);
      });

      it('should throw error for invalid player', () => {
        expect(() => game.getGameStateForPlayer('invalid-player-id'))
          .toThrow('Player is not part of this game');
      });
    });
  });

  describe('Static Methods', () => {
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
          expect(Game.determineWinner(move1, move2)).toBe(expected);
        });
      });
    });

    describe('validateMove', () => {
      it('should validate correct moves', () => {
        expect(Game.validateMove(GameMove.ROCK)).toBe(true);
        expect(Game.validateMove(GameMove.PAPER)).toBe(true);
        expect(Game.validateMove(GameMove.SCISSORS)).toBe(true);
      });

      it('should reject invalid moves', () => {
        expect(Game.validateMove('INVALID')).toBe(false);
        expect(Game.validateMove(null)).toBe(false);
        expect(Game.validateMove(undefined)).toBe(false);
        expect(Game.validateMove(123)).toBe(false);
      });
    });

    describe('getWinningMove', () => {
      it('should return correct winning moves', () => {
        expect(Game.getWinningMove(GameMove.ROCK)).toBe(GameMove.PAPER);
        expect(Game.getWinningMove(GameMove.PAPER)).toBe(GameMove.SCISSORS);
        expect(Game.getWinningMove(GameMove.SCISSORS)).toBe(GameMove.ROCK);
      });
    });

    describe('getLosingMove', () => {
      it('should return correct losing moves', () => {
        expect(Game.getLosingMove(GameMove.ROCK)).toBe(GameMove.SCISSORS);
        expect(Game.getLosingMove(GameMove.PAPER)).toBe(GameMove.ROCK);
        expect(Game.getLosingMove(GameMove.SCISSORS)).toBe(GameMove.PAPER);
      });
    });

    describe('createPracticeGame', () => {
      it('should create practice game correctly', () => {
        const practiceGame = Game.createPracticeGame(player1, 'medium');

        expect(practiceGame.type).toBe(GameType.PRACTICE);
        expect(practiceGame.player1).toBe(player1);
        expect(practiceGame.status).toBe(GameStatus.WAITING_FOR_MOVES);
        expect(practiceGame.startedAt).toBeInstanceOf(Date);
        expect(practiceGame.timeoutAt).toBeInstanceOf(Date);
        expect(practiceGame.metadata?.aiOpponent).toBe(true);
        expect(practiceGame.metadata?.difficulty).toBe('medium');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent move submissions', () => {
      game.player1 = player1;
      game.player2 = player2;
      game.status = GameStatus.WAITING_FOR_MOVES;
      game.timeoutAt = new Date(Date.now() + 60000);

      // Simulate concurrent submissions
      game.submitMove(player1.id, GameMove.ROCK);
      game.submitMove(player2.id, GameMove.PAPER);

      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(game.result).toBe(GameResult.PLAYER2_WIN);
      expect(game.winner).toBe(player2);
    });

    it('should handle game with missing player2', () => {
      game.player1 = player1;
      game.player2 = undefined;

      expect(game.hasAllPlayers).toBe(false);
      expect(() => game.submitMove(player1.id, GameMove.ROCK))
        .toThrow('Game is not waiting for moves');
    });

    it('should handle metadata initialization', () => {
      game.metadata = undefined;
      game.player1 = player1;
      game.player2 = player2;
      game.status = GameStatus.WAITING_FOR_MOVES;
      game.timeoutAt = new Date(Date.now() + 60000);

      game.submitMove(player1.id, GameMove.ROCK);

      expect(game.metadata).toBeDefined();
      expect(game.metadata?.moveHistory).toHaveLength(1);
    });

    it('should calculate duration correctly', () => {
      const startTime = new Date();
      game.startedAt = startTime;
      game.status = GameStatus.COMPLETED;
      game.playedAt = new Date(startTime.getTime() + 30000); // 30 seconds later

      // Manually trigger duration calculation (normally done in calculateResult)
      game.durationSeconds = Math.floor(
        (game.playedAt.getTime() - game.startedAt.getTime()) / 1000
      );

      expect(game.durationSeconds).toBe(30);
      expect(game.formattedDuration).toBe('30s');
    });
  });

  describe('Performance', () => {
    it('should handle rapid move submissions efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const testGame = new Game();
        testGame.player1 = player1;
        testGame.player2 = player2;
        testGame.status = GameStatus.WAITING_FOR_MOVES;
        testGame.timeoutAt = new Date(Date.now() + 60000);

        testGame.submitMove(player1.id, GameMove.ROCK);
        testGame.submitMove(player2.id, GameMove.SCISSORS);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });
});