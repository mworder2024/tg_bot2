import { validate } from 'class-validator';
import { UserStats } from '../user-stats.entity';
import { User } from '../user.entity';

describe('UserStats Entity', () => {
  let userStats: UserStats;
  let user: User;

  beforeEach(() => {
    user = new User();
    user.telegramId = 123456789;
    user.username = 'testuser';

    userStats = new UserStats();
    userStats.user = user;
    userStats.gamesPlayed = 10;
    userStats.gamesWon = 6;
    userStats.gamesLost = 3;
    userStats.gamesDrawn = 1;
    userStats.winRate = 60;
    userStats.rockPlayed = 3;
    userStats.paperPlayed = 4;
    userStats.scissorsPlayed = 3;
    userStats.rockWins = 2;
    userStats.paperWins = 2;
    userStats.scissorsWins = 2;
    userStats.tournamentsPlayed = 2;
    userStats.tournamentsWon = 1;
    userStats.tournamentFinals = 1;
    userStats.tournamentSemifinals = 2;
    userStats.tournamentWinRate = 50;
    userStats.currentStreak = 3;
    userStats.bestStreak = 5;
    userStats.currentLosingStreak = 0;
    userStats.worstLosingStreak = 2;
  });

  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(userStats);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with negative games played', async () => {
      userStats.gamesPlayed = -1;
      const errors = await validate(userStats);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('gamesPlayed');
    });

    it('should fail validation with negative wins', async () => {
      userStats.gamesWon = -1;
      const errors = await validate(userStats);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('gamesWon');
    });

    it('should pass validation with zero values', async () => {
      userStats.gamesPlayed = 0;
      userStats.gamesWon = 0;
      userStats.gamesLost = 0;
      userStats.currentStreak = 0;
      const errors = await validate(userStats);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    describe('winPercentage', () => {
      it('should calculate correct win percentage', () => {
        userStats.gamesPlayed = 10;
        userStats.gamesWon = 7;
        expect(userStats.winPercentage).toBe(0.7);
      });

      it('should return 0 when no games played', () => {
        userStats.gamesPlayed = 0;
        userStats.gamesWon = 0;
        expect(userStats.winPercentage).toBe(0);
      });

      it('should handle perfect win rate', () => {
        userStats.gamesPlayed = 5;
        userStats.gamesWon = 5;
        expect(userStats.winPercentage).toBe(1);
      });
    });

    describe('tournamentWinPercentage', () => {
      it('should calculate correct tournament win percentage', () => {
        userStats.tournamentsPlayed = 10;
        userStats.tournamentsWon = 3;
        expect(userStats.tournamentWinPercentage).toBe(0.3);
      });

      it('should return 0 when no tournaments played', () => {
        userStats.tournamentsPlayed = 0;
        userStats.tournamentsWon = 0;
        expect(userStats.tournamentWinPercentage).toBe(0);
      });
    });

    describe('mostPlayedMove', () => {
      it('should return most played move', () => {
        userStats.rockPlayed = 10;
        userStats.paperPlayed = 5;
        userStats.scissorsPlayed = 3;
        expect(userStats.mostPlayedMove).toBe('ROCK');
      });

      it('should handle ties by returning first encountered', () => {
        userStats.rockPlayed = 5;
        userStats.paperPlayed = 5;
        userStats.scissorsPlayed = 3;
        expect(userStats.mostPlayedMove).toBe('ROCK');
      });

      it('should return null when no moves played', () => {
        userStats.rockPlayed = 0;
        userStats.paperPlayed = 0;
        userStats.scissorsPlayed = 0;
        expect(userStats.mostPlayedMove).toBeNull();
      });
    });

    describe('moveWinRates', () => {
      it('should calculate correct win rates for all moves', () => {
        userStats.rockPlayed = 10;
        userStats.rockWins = 7;
        userStats.paperPlayed = 8;
        userStats.paperWins = 4;
        userStats.scissorsPlayed = 5;
        userStats.scissorsWins = 2;

        const rates = userStats.moveWinRates;
        expect(rates.rock).toBe(0.7);
        expect(rates.paper).toBe(0.5);
        expect(rates.scissors).toBe(0.4);
      });

      it('should return 0 for moves not played', () => {
        userStats.rockPlayed = 0;
        userStats.paperPlayed = 0;
        userStats.scissorsPlayed = 0;

        const rates = userStats.moveWinRates;
        expect(rates.rock).toBe(0);
        expect(rates.paper).toBe(0);
        expect(rates.scissors).toBe(0);
      });
    });

    describe('streak properties', () => {
      it('should correctly identify winning streak', () => {
        userStats.currentStreak = 5;
        userStats.currentLosingStreak = 0;
        expect(userStats.isOnWinningStreak).toBe(true);
        expect(userStats.isOnLosingStreak).toBe(false);
      });

      it('should correctly identify losing streak', () => {
        userStats.currentStreak = 0;
        userStats.currentLosingStreak = 3;
        expect(userStats.isOnWinningStreak).toBe(false);
        expect(userStats.isOnLosingStreak).toBe(true);
      });

      it('should handle no streak', () => {
        userStats.currentStreak = 0;
        userStats.currentLosingStreak = 0;
        expect(userStats.isOnWinningStreak).toBe(false);
        expect(userStats.isOnLosingStreak).toBe(false);
      });
    });
  });

  describe('Methods', () => {
    describe('recordGameResult', () => {
      beforeEach(() => {
        // Reset stats for clean testing
        userStats.gamesPlayed = 0;
        userStats.gamesWon = 0;
        userStats.gamesLost = 0;
        userStats.gamesDrawn = 0;
        userStats.rockPlayed = 0;
        userStats.paperPlayed = 0;
        userStats.scissorsPlayed = 0;
        userStats.rockWins = 0;
        userStats.paperWins = 0;
        userStats.scissorsWins = 0;
        userStats.currentStreak = 0;
        userStats.currentLosingStreak = 0;
        userStats.bestStreak = 0;
        userStats.worstLosingStreak = 0;
        userStats.winRate = 0;
        userStats.gamesToday = 0;
        userStats.gamesThisWeek = 0;
        userStats.gamesThisMonth = 0;
      });

      it('should record a win correctly', () => {
        userStats.recordGameResult('win', 'ROCK', 30);

        expect(userStats.gamesPlayed).toBe(1);
        expect(userStats.gamesWon).toBe(1);
        expect(userStats.gamesLost).toBe(0);
        expect(userStats.gamesDrawn).toBe(0);
        expect(userStats.rockPlayed).toBe(1);
        expect(userStats.rockWins).toBe(1);
        expect(userStats.currentStreak).toBe(1);
        expect(userStats.currentLosingStreak).toBe(0);
        expect(userStats.bestStreak).toBe(1);
        expect(userStats.winRate).toBe(100);
        expect(userStats.lastWinAt).toBeInstanceOf(Date);
        expect(userStats.avgGameDuration).toBe(30);
        expect(userStats.totalPlayTime).toBe(30);
      });

      it('should record a loss correctly', () => {
        userStats.recordGameResult('loss', 'PAPER', 45);

        expect(userStats.gamesPlayed).toBe(1);
        expect(userStats.gamesWon).toBe(0);
        expect(userStats.gamesLost).toBe(1);
        expect(userStats.gamesDrawn).toBe(0);
        expect(userStats.paperPlayed).toBe(1);
        expect(userStats.paperWins).toBe(0);
        expect(userStats.currentStreak).toBe(0);
        expect(userStats.currentLosingStreak).toBe(1);
        expect(userStats.worstLosingStreak).toBe(1);
        expect(userStats.winRate).toBe(0);
      });

      it('should record a draw correctly', () => {
        userStats.recordGameResult('draw', 'SCISSORS');

        expect(userStats.gamesPlayed).toBe(1);
        expect(userStats.gamesWon).toBe(0);
        expect(userStats.gamesLost).toBe(0);
        expect(userStats.gamesDrawn).toBe(1);
        expect(userStats.scissorsPlayed).toBe(1);
        expect(userStats.scissorsWins).toBe(0);
        expect(userStats.currentStreak).toBe(0);
        expect(userStats.currentLosingStreak).toBe(0);
        expect(userStats.winRate).toBe(0);
      });

      it('should handle win streak correctly', () => {
        // Record multiple wins
        userStats.recordGameResult('win', 'ROCK');
        userStats.recordGameResult('win', 'PAPER');
        userStats.recordGameResult('win', 'SCISSORS');

        expect(userStats.currentStreak).toBe(3);
        expect(userStats.bestStreak).toBe(3);
        expect(userStats.currentLosingStreak).toBe(0);
      });

      it('should handle losing streak correctly', () => {
        // Record multiple losses
        userStats.recordGameResult('loss', 'ROCK');
        userStats.recordGameResult('loss', 'PAPER');
        userStats.recordGameResult('loss', 'SCISSORS');

        expect(userStats.currentStreak).toBe(0);
        expect(userStats.currentLosingStreak).toBe(3);
        expect(userStats.worstLosingStreak).toBe(3);
      });

      it('should break losing streak with win', () => {
        // Start with losing streak
        userStats.currentLosingStreak = 2;
        userStats.worstLosingStreak = 2;

        userStats.recordGameResult('win', 'ROCK');

        expect(userStats.currentStreak).toBe(1);
        expect(userStats.currentLosingStreak).toBe(0);
        expect(userStats.worstLosingStreak).toBe(2); // Should not change
      });

      it('should update preferred and most successful moves', () => {
        // Play mostly rock and win with it
        userStats.recordGameResult('win', 'ROCK');
        userStats.recordGameResult('win', 'ROCK');
        userStats.recordGameResult('loss', 'PAPER');

        expect(userStats.preferredMove).toBe('ROCK');
        expect(userStats.mostSuccessfulMove).toBe('ROCK');
      });

      it('should calculate average game duration correctly', () => {
        userStats.recordGameResult('win', 'ROCK', 30);
        userStats.recordGameResult('win', 'PAPER', 60);

        expect(userStats.avgGameDuration).toBe(45); // (30 + 60) / 2
        expect(userStats.totalPlayTime).toBe(90);
      });
    });

    describe('recordTournamentResult', () => {
      beforeEach(() => {
        userStats.tournamentsPlayed = 0;
        userStats.tournamentsWon = 0;
        userStats.tournamentFinals = 0;
        userStats.tournamentSemifinals = 0;
        userStats.tournamentWinRate = 0;
      });

      it('should record tournament winner correctly', () => {
        userStats.recordTournamentResult('winner');

        expect(userStats.tournamentsPlayed).toBe(1);
        expect(userStats.tournamentsWon).toBe(1);
        expect(userStats.tournamentFinals).toBe(1);
        expect(userStats.tournamentSemifinals).toBe(1);
        expect(userStats.tournamentWinRate).toBe(100);
        expect(userStats.lastTournamentWinAt).toBeInstanceOf(Date);
      });

      it('should record finalist correctly', () => {
        userStats.recordTournamentResult('finalist');

        expect(userStats.tournamentsPlayed).toBe(1);
        expect(userStats.tournamentsWon).toBe(0);
        expect(userStats.tournamentFinals).toBe(1);
        expect(userStats.tournamentSemifinals).toBe(1);
        expect(userStats.tournamentWinRate).toBe(0);
      });

      it('should record semifinalist correctly', () => {
        userStats.recordTournamentResult('semifinalist');

        expect(userStats.tournamentsPlayed).toBe(1);
        expect(userStats.tournamentsWon).toBe(0);
        expect(userStats.tournamentFinals).toBe(0);
        expect(userStats.tournamentSemifinals).toBe(1);
        expect(userStats.tournamentWinRate).toBe(0);
      });

      it('should record participant correctly', () => {
        userStats.recordTournamentResult('participant');

        expect(userStats.tournamentsPlayed).toBe(1);
        expect(userStats.tournamentsWon).toBe(0);
        expect(userStats.tournamentFinals).toBe(0);
        expect(userStats.tournamentSemifinals).toBe(0);
        expect(userStats.tournamentWinRate).toBe(0);
      });

      it('should calculate tournament win rate correctly', () => {
        userStats.recordTournamentResult('winner');
        userStats.recordTournamentResult('participant');
        userStats.recordTournamentResult('finalist');

        expect(userStats.tournamentsPlayed).toBe(3);
        expect(userStats.tournamentsWon).toBe(1);
        expect(userStats.tournamentWinRate).toBeCloseTo(33.33, 1);
      });
    });

    describe('resetDailyStats', () => {
      it('should update best daily games and reset today count', () => {
        userStats.gamesToday = 15;
        userStats.bestDailyGames = 10;

        userStats.resetDailyStats();

        expect(userStats.bestDailyGames).toBe(15);
        expect(userStats.gamesToday).toBe(0);
      });

      it('should not update best daily games if current is lower', () => {
        userStats.gamesToday = 5;
        userStats.bestDailyGames = 10;

        userStats.resetDailyStats();

        expect(userStats.bestDailyGames).toBe(10);
        expect(userStats.gamesToday).toBe(0);
      });
    });

    describe('resetWeeklyStats', () => {
      it('should reset weekly games count', () => {
        userStats.gamesThisWeek = 25;
        userStats.resetWeeklyStats();
        expect(userStats.gamesThisWeek).toBe(0);
      });
    });

    describe('resetMonthlyStats', () => {
      it('should reset monthly games count', () => {
        userStats.gamesThisMonth = 100;
        userStats.resetMonthlyStats();
        expect(userStats.gamesThisMonth).toBe(0);
      });
    });

    describe('getSummary', () => {
      it('should return comprehensive statistics summary', () => {
        userStats.gamesPlayed = 50;
        userStats.gamesWon = 30;
        userStats.gamesLost = 15;
        userStats.gamesDrawn = 5;
        userStats.winRate = 60;
        userStats.tournamentsPlayed = 5;
        userStats.tournamentsWon = 2;
        userStats.tournamentFinals = 3;
        userStats.tournamentWinRate = 40;
        userStats.currentStreak = 3;
        userStats.bestStreak = 8;
        userStats.currentLosingStreak = 0;
        userStats.worstLosingStreak = 4;
        userStats.preferredMove = 'ROCK';
        userStats.mostSuccessfulMove = 'PAPER';
        userStats.gamesToday = 5;
        userStats.gamesThisWeek = 15;
        userStats.gamesThisMonth = 45;
        userStats.lastGameAt = new Date();

        const summary = userStats.getSummary();

        expect(summary.games).toEqual({
          played: 50,
          won: 30,
          lost: 15,
          drawn: 5,
          winRate: 60,
        });

        expect(summary.tournaments).toEqual({
          played: 5,
          won: 2,
          finals: 3,
          winRate: 40,
        });

        expect(summary.streaks).toEqual({
          current: 3,
          best: 8,
          currentLosing: 0,
          worst: 4,
        });

        expect(summary.moves).toEqual({
          preferred: 'ROCK',
          mostSuccessful: 'PAPER',
          winRates: userStats.moveWinRates,
        });

        expect(summary.activity).toEqual({
          today: 5,
          thisWeek: 15,
          thisMonth: 45,
          lastGame: userStats.lastGameAt,
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme values', () => {
      userStats.gamesPlayed = 999999;
      userStats.gamesWon = 999999;
      userStats.bestStreak = 1000;
      userStats.avgGameDuration = 3600; // 1 hour

      expect(() => userStats.recordGameResult('win', 'ROCK', 7200)).not.toThrow();
    });

    it('should handle division by zero scenarios', () => {
      userStats.gamesPlayed = 0;
      userStats.rockPlayed = 0;
      userStats.paperPlayed = 0;
      userStats.scissorsPlayed = 0;

      expect(userStats.winPercentage).toBe(0);
      expect(userStats.moveWinRates.rock).toBe(0);
      expect(userStats.mostPlayedMove).toBeNull();
    });

    it('should handle null date fields', () => {
      userStats.lastGameAt = undefined;
      userStats.lastWinAt = undefined;
      userStats.lastTournamentWinAt = undefined;

      const summary = userStats.getSummary();
      expect(summary.activity.lastGame).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of game results efficiently', () => {
      const startTime = Date.now();
      
      // Record 1000 game results
      for (let i = 0; i < 1000; i++) {
        const moves: Array<'ROCK' | 'PAPER' | 'SCISSORS'> = ['ROCK', 'PAPER', 'SCISSORS'];
        const results: Array<'win' | 'loss' | 'draw'> = ['win', 'loss', 'draw'];
        
        userStats.recordGameResult(
          results[i % 3],
          moves[i % 3],
          Math.floor(Math.random() * 60) + 10
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(userStats.gamesPlayed).toBe(1000);
    });
  });
});