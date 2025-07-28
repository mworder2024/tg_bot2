import { faker } from '@faker-js/faker';
import { User } from '../../src/entities/user.entity';

/**
 * User Factory - Generate test users with realistic data
 */
export class UserFactory {
  /**
   * Create a basic user with required fields
   */
  static create(overrides: Partial<User> = {}): User {
    const user = new User();
    
    user.id = overrides.id || faker.string.uuid();
    user.telegramId = overrides.telegramId || faker.number.int({ min: 100000000, max: 999999999 });
    user.username = overrides.username || faker.internet.userName().toLowerCase();
    user.firstName = overrides.firstName || faker.person.firstName();
    user.lastName = overrides.lastName || faker.person.lastName();
    user.languageCode = overrides.languageCode || 'en';
    user.isPremium = overrides.isPremium || false;
    user.isActive = overrides.isActive !== undefined ? overrides.isActive : true;
    user.email = overrides.email || faker.internet.email();
    user.eloRating = overrides.eloRating || 1200;
    user.peakRating = overrides.peakRating || user.eloRating;
    user.lastActiveAt = overrides.lastActiveAt || new Date();
    user.createdAt = overrides.createdAt || new Date();
    user.updatedAt = overrides.updatedAt || new Date();
    
    user.preferences = overrides.preferences || {
      notifications: true,
      theme: 'light' as const,
      language: 'en',
      gameResultNotifications: true,
    };
    
    return user;
  }

  /**
   * Create a premium user
   */
  static createPremium(overrides: Partial<User> = {}): User {
    return this.create({
      isPremium: true,
      eloRating: faker.number.int({ min: 1400, max: 2000 }),
      ...overrides,
    });
  }

  /**
   * Create a new player (low ELO)
   */
  static createNewPlayer(overrides: Partial<User> = {}): User {
    return this.create({
      eloRating: faker.number.int({ min: 1000, max: 1300 }),
      ...overrides,
    });
  }

  /**
   * Create an expert player (high ELO)
   */
  static createExpert(overrides: Partial<User> = {}): User {
    return this.create({
      eloRating: faker.number.int({ min: 1800, max: 2500 }),
      ...overrides,
    });
  }

  /**
   * Create multiple users
   */
  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create a pair of users for testing games
   */
  static createPlayerPair(): [User, User] {
    return [
      this.create({ username: 'player1' }),
      this.create({ username: 'player2' }),
    ];
  }
}