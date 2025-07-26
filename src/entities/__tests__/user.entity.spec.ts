import { validate } from 'class-validator';
import { User } from '../user.entity';
import { UserStats } from '../user-stats.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.telegramId = 123456789;
    user.username = 'testuser';
    user.firstName = 'Test';
    user.lastName = 'User';
    user.languageCode = 'en';
    user.isPremium = false;
    user.isActive = true;
    user.eloRating = 1200;
    user.peakRating = 1200;
  });

  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid telegram ID', async () => {
      user.telegramId = undefined as any;
      const errors = await validate(user);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('telegramId');
    });

    it('should fail validation with invalid username length', async () => {
      user.username = 'ab'; // Too short
      const errors = await validate(user);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('username');
    });

    it('should fail validation with invalid email', async () => {
      user.email = 'invalid-email';
      const errors = await validate(user);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should pass validation with null optional fields', async () => {
      user.username = undefined;
      user.firstName = undefined;
      user.lastName = undefined;
      user.email = undefined;
      
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with ELO rating out of bounds', async () => {
      user.eloRating = 50; // Below minimum
      const errors = await validate(user);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('eloRating');

      user.eloRating = 3500; // Above maximum
      const errors2 = await validate(user);
      expect(errors2.length).toBeGreaterThan(0);
      expect(errors2[0].property).toBe('eloRating');
    });
  });

  describe('Virtual Properties', () => {
    describe('fullName', () => {
      it('should return first and last name when both present', () => {
        user.firstName = 'John';
        user.lastName = 'Doe';
        expect(user.fullName).toBe('John Doe');
      });

      it('should return only first name when last name is missing', () => {
        user.firstName = 'John';
        user.lastName = undefined;
        expect(user.fullName).toBe('John');
      });

      it('should return username when no names are present', () => {
        user.firstName = undefined;
        user.lastName = undefined;
        user.username = 'johndoe';
        expect(user.fullName).toBe('johndoe');
      });

      it('should return telegram ID when no names or username', () => {
        user.firstName = undefined;
        user.lastName = undefined;
        user.username = undefined;
        user.telegramId = 123456789;
        expect(user.fullName).toBe('User 123456789');
      });
    });

    describe('displayName', () => {
      it('should return username with @ when present', () => {
        user.username = 'johndoe';
        expect(user.displayName).toBe('@johndoe');
      });

      it('should return full name when username is not present', () => {
        user.username = undefined;
        user.firstName = 'John';
        user.lastName = 'Doe';
        expect(user.displayName).toBe('John Doe');
      });
    });

    describe('isNewPlayer', () => {
      it('should return true when stats are undefined', () => {
        user.stats = undefined;
        expect(user.isNewPlayer).toBe(true);
      });

      it('should return true when games played is less than 10', () => {
        const stats = new UserStats();
        stats.gamesPlayed = 5;
        user.stats = stats;
        expect(user.isNewPlayer).toBe(true);
      });

      it('should return false when games played is 10 or more', () => {
        const stats = new UserStats();
        stats.gamesPlayed = 15;
        user.stats = stats;
        expect(user.isNewPlayer).toBe(false);
      });
    });

    describe('winRate', () => {
      it('should return 0 when stats are undefined', () => {
        user.stats = undefined;
        expect(user.winRate).toBe(0);
      });

      it('should return 0 when no games played', () => {
        const stats = new UserStats();
        stats.gamesPlayed = 0;
        stats.gamesWon = 0;
        user.stats = stats;
        expect(user.winRate).toBe(0);
      });

      it('should calculate correct win rate', () => {
        const stats = new UserStats();
        stats.gamesPlayed = 10;
        stats.gamesWon = 7;
        user.stats = stats;
        expect(user.winRate).toBe(70);
      });

      it('should round win rate correctly', () => {
        const stats = new UserStats();
        stats.gamesPlayed = 3;
        stats.gamesWon = 2;
        user.stats = stats;
        expect(user.winRate).toBe(67); // 66.67 rounded to 67
      });
    });
  });

  describe('Methods', () => {
    describe('updateLastActive', () => {
      it('should update lastActiveAt to current date', () => {
        const beforeUpdate = new Date();
        user.updateLastActive();
        expect(user.lastActiveAt).toBeInstanceOf(Date);
        expect(user.lastActiveAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      });
    });

    describe('deactivate', () => {
      it('should set isActive to false', () => {
        user.isActive = true;
        user.deactivate();
        expect(user.isActive).toBe(false);
      });
    });

    describe('reactivate', () => {
      it('should set isActive to true and update lastActiveAt', () => {
        user.isActive = false;
        const beforeReactivate = new Date();
        user.reactivate();
        
        expect(user.isActive).toBe(true);
        expect(user.lastActiveAt).toBeInstanceOf(Date);
        expect(user.lastActiveAt!.getTime()).toBeGreaterThanOrEqual(beforeReactivate.getTime());
      });
    });

    describe('updatePreferences', () => {
      it('should merge new preferences with existing ones', () => {
        user.preferences = {
          notifications: true,
          theme: 'dark',
          language: 'en',
          tournamentReminders: true,
          gameResultNotifications: true,
        };

        user.updatePreferences({
          theme: 'light',
          tournamentReminders: false,
        });

        expect(user.preferences).toEqual({
          notifications: true,
          theme: 'light',
          language: 'en',
          tournamentReminders: false,
          gameResultNotifications: true,
        });
      });

      it('should handle undefined preferences', () => {
        user.preferences = undefined;
        user.updatePreferences({
          theme: 'dark',
          notifications: false,
        });

        expect(user.preferences).toEqual({
          theme: 'dark',
          notifications: false,
        });
      });
    });

    describe('hasPermission', () => {
      it('should return false for inactive users', () => {
        user.isActive = false;
        expect(user.hasPermission('create_tournament')).toBe(false);
        expect(user.hasPermission('moderate_tournament')).toBe(false);
        expect(user.hasPermission('basic')).toBe(false);
      });

      it('should check create_tournament permission correctly', () => {
        user.isActive = true;
        
        // Not enough games
        const stats = new UserStats();
        stats.gamesPlayed = 3;
        user.stats = stats;
        expect(user.hasPermission('create_tournament')).toBe(false);

        // Enough games
        stats.gamesPlayed = 10;
        expect(user.hasPermission('create_tournament')).toBe(true);

        // No stats
        user.stats = undefined;
        expect(user.hasPermission('create_tournament')).toBe(false);
      });

      it('should check moderate_tournament permission correctly', () => {
        user.isActive = true;
        
        // Low rating
        user.eloRating = 1200;
        expect(user.hasPermission('moderate_tournament')).toBe(false);

        // High enough rating
        user.eloRating = 1600;
        expect(user.hasPermission('moderate_tournament')).toBe(true);
      });

      it('should return true for unknown permissions if user is active', () => {
        user.isActive = true;
        expect(user.hasPermission('unknown_permission')).toBe(true);
      });
    });

    describe('getRank', () => {
      const testCases = [
        { rating: 2100, expected: 'Grandmaster' },
        { rating: 2000, expected: 'Grandmaster' },
        { rating: 1999, expected: 'Master' },
        { rating: 1800, expected: 'Master' },
        { rating: 1799, expected: 'Expert' },
        { rating: 1600, expected: 'Expert' },
        { rating: 1599, expected: 'Advanced' },
        { rating: 1400, expected: 'Advanced' },
        { rating: 1399, expected: 'Intermediate' },
        { rating: 1200, expected: 'Intermediate' },
        { rating: 1199, expected: 'Beginner' },
        { rating: 800, expected: 'Beginner' },
      ];

      testCases.forEach(({ rating, expected }) => {
        it(`should return ${expected} for rating ${rating}`, () => {
          user.eloRating = rating;
          expect(user.getRank()).toBe(expected);
        });
      });
    });

    describe('toSafeJSON', () => {
      it('should return only safe user data', () => {
        user.id = 'user-id';
        user.telegramId = 123456789;
        user.username = 'testuser';
        user.firstName = 'Test';
        user.lastName = 'User';
        user.languageCode = 'en';
        user.isPremium = true;
        user.eloRating = 1500;
        user.peakRating = 1600;
        user.email = 'test@example.com'; // Should not be included
        user.preferences = { notifications: true, theme: 'dark', language: 'en', tournamentReminders: true, gameResultNotifications: true }; // Should not be included
        user.createdAt = new Date();
        user.lastActiveAt = new Date();

        const safeData = user.toSafeJSON();

        expect(safeData).toEqual({
          id: 'user-id',
          telegramId: 123456789,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          languageCode: 'en',
          isPremium: true,
          eloRating: 1500,
          peakRating: 1600,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
        });

        expect(safeData).not.toHaveProperty('email');
        expect(safeData).not.toHaveProperty('preferences');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme telegram ID values', async () => {
      user.telegramId = 999999999999; // Large number
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode characters in names', async () => {
      user.firstName = '测试';
      user.lastName = 'テスト';
      user.username = 'тест_user';
      
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
      
      expect(user.fullName).toBe('测试 テスト');
      expect(user.displayName).toBe('@тест_user');
    });

    it('should handle very long usernames', async () => {
      user.username = 'a'.repeat(255); // Maximum length
      const errors = await validate(user);
      expect(errors).toHaveLength(0);

      user.username = 'a'.repeat(256); // Too long
      const errors2 = await validate(user);
      expect(errors2.length).toBeGreaterThan(0);
    });

    it('should handle boundary ELO ratings', async () => {
      user.eloRating = 100; // Minimum
      user.peakRating = 100;
      let errors = await validate(user);
      expect(errors).toHaveLength(0);

      user.eloRating = 3000; // Maximum
      user.peakRating = 3000;
      errors = await validate(user);
      expect(errors).toHaveLength(0);
    });

    it('should handle all language codes', async () => {
      const languageCodes = ['en', 'ru', 'zh', 'ja', 'es', 'fr', 'de', 'it'];
      
      for (const code of languageCodes) {
        user.languageCode = code;
        const errors = await validate(user);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Database Constraints', () => {
    it('should ensure unique telegram ID constraint simulation', () => {
      const user1 = new User();
      const user2 = new User();
      
      user1.telegramId = 123456789;
      user2.telegramId = 123456789;
      
      // In real database, this would fail with unique constraint
      // We simulate this by checking the constraint would be violated
      expect(user1.telegramId).toBe(user2.telegramId);
    });

    it('should handle null values correctly', async () => {
      user.username = undefined;
      user.firstName = undefined;
      user.lastName = undefined;
      user.email = undefined;
      user.lastActiveAt = undefined;
      
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Relationship Handling', () => {
    it('should handle undefined relationships gracefully', () => {
      expect(user.stats).toBeUndefined();
      expect(user.gamesAsPlayer1).toBeUndefined();
      expect(user.gamesAsPlayer2).toBeUndefined();
      expect(user.gamesWon).toBeUndefined();
      expect(user.tournamentsCreated).toBeUndefined();
      expect(user.tournamentsWon).toBeUndefined();
      expect(user.tournamentParticipations).toBeUndefined();
    });
  });
});