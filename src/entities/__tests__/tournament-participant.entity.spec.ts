import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { TournamentParticipant, ParticipantStatus } from '../tournament-participant.entity';
import { User } from '../user.entity';
import { Tournament, TournamentStatus, TournamentFormat } from '../tournament.entity';

describe('TournamentParticipant Entity', () => {
  let module: TestingModule;
  let participant: TournamentParticipant;
  let user: User;
  let tournament: Tournament;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [],
    }).compile();

    // Create test user
    user = new User();
    user.id = 'user-id';
    user.telegramId = 12345;
    user.username = 'testplayer';
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.eloRating = 1500;

    // Create test tournament
    tournament = new Tournament();
    tournament.id = 'tournament-id';
    tournament.name = 'Test Tournament';
    tournament.format = TournamentFormat.SINGLE_ELIMINATION;
    tournament.status = TournamentStatus.REGISTRATION_OPEN;
    tournament.maxPlayers = 16;
    tournament.organizerId = 'organizer-id';

    // Create test participant
    participant = new TournamentParticipant();
    participant.id = 'participant-id';
    participant.tournament = tournament;
    participant.user = user;
    participant.status = ParticipantStatus.REGISTERED;
    participant.seed = 5;
    participant.points = 0;
    participant.matchesPlayed = 0;
    participant.matchesWon = 0;
    participant.matchesLost = 0;
    participant.gamesPlayed = 0;
    participant.gamesWon = 0;
    participant.gamesLost = 0;
    participant.gamesDrawn = 0;
    participant.rockPlayed = 0;
    participant.paperPlayed = 0;
    participant.scissorsPlayed = 0;
    participant.ratingChange = 0;
    participant.totalMatchTime = 0;
    participant.prizeEarned = 0;
    participant.registeredAt = new Date();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Entity Validation', () => {
    it('should validate a valid tournament participant', async () => {
      const errors = await validate(participant);
      expect(errors).toHaveLength(0);
    });

    it('should require tournament', async () => {
      participant.tournament = null as any;
      const errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require user', async () => {
      participant.user = null as any;
      const errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate status is valid enum value', async () => {
      participant.status = 'INVALID_STATUS' as any;
      const errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require positive seed when provided', async () => {
      participant.seed = 0;
      let errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.seed = -1;
      errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.seed = 5;
      errors = await validate(participant);
      expect(errors).toHaveLength(0);
    });

    it('should require positive final position when provided', async () => {
      participant.finalPosition = 0;
      let errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.finalPosition = 1;
      errors = await validate(participant);
      expect(errors).toHaveLength(0);
    });

    it('should validate non-negative numeric fields', async () => {
      const numericFields = [
        'points', 'matchesPlayed', 'matchesWon', 'matchesLost',
        'gamesPlayed', 'gamesWon', 'gamesLost', 'gamesDrawn',
        'rockPlayed', 'paperPlayed', 'scissorsPlayed',
        'totalMatchTime', 'prizeEarned'
      ];

      for (const field of numericFields) {
        (participant as any)[field] = -1;
        const errors = await validate(participant);
        expect(errors.length).toBeGreaterThan(0);
        (participant as any)[field] = 0;
      }
    });

    it('should validate rating fields when provided', async () => {
      participant.startingRating = -100;
      let errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.startingRating = 1500;
      participant.performanceRating = -100;
      errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.performanceRating = 1600;
      participant.strengthOfSchedule = -100;
      errors = await validate(participant);
      expect(errors.length).toBeGreaterThan(0);

      participant.strengthOfSchedule = 1550;
      errors = await validate(participant);
      expect(errors).toHaveLength(0);
    });

    it('should validate date fields', async () => {
      participant.registeredAt = new Date();
      participant.eliminatedAt = new Date();
      
      const errors = await validate(participant);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    describe('matchWinRate', () => {
      it('should calculate match win rate correctly', () => {
        participant.matchesPlayed = 10;
        participant.matchesWon = 7;
        expect(participant.matchWinRate).toBe(0.7);
      });

      it('should return 0 when no matches played', () => {
        participant.matchesPlayed = 0;
        participant.matchesWon = 0;
        expect(participant.matchWinRate).toBe(0);
      });

      it('should handle perfect win rate', () => {
        participant.matchesPlayed = 5;
        participant.matchesWon = 5;
        expect(participant.matchWinRate).toBe(1.0);
      });
    });

    describe('gameWinRate', () => {
      it('should calculate game win rate correctly', () => {
        participant.gamesPlayed = 20;
        participant.gamesWon = 14;
        expect(participant.gameWinRate).toBe(0.7);
      });

      it('should return 0 when no games played', () => {
        participant.gamesPlayed = 0;
        participant.gamesWon = 0;
        expect(participant.gameWinRate).toBe(0);
      });

      it('should handle perfect win rate', () => {
        participant.gamesPlayed = 15;
        participant.gamesWon = 15;
        expect(participant.gameWinRate).toBe(1.0);
      });
    });

    describe('isActive', () => {
      it('should return true for REGISTERED status', () => {
        participant.status = ParticipantStatus.REGISTERED;
        expect(participant.isActive).toBe(true);
      });

      it('should return true for ACTIVE status', () => {
        participant.status = ParticipantStatus.ACTIVE;
        expect(participant.isActive).toBe(true);
      });

      it('should return false for ELIMINATED status', () => {
        participant.status = ParticipantStatus.ELIMINATED;
        expect(participant.isActive).toBe(false);
      });

      it('should return false for WINNER status', () => {
        participant.status = ParticipantStatus.WINNER;
        expect(participant.isActive).toBe(false);
      });
    });

    describe('isEliminated', () => {
      it('should return true for ELIMINATED status', () => {
        participant.status = ParticipantStatus.ELIMINATED;
        expect(participant.isEliminated).toBe(true);
      });

      it('should return true for DISQUALIFIED status', () => {
        participant.status = ParticipantStatus.DISQUALIFIED;
        expect(participant.isEliminated).toBe(true);
      });

      it('should return true for WITHDREW status', () => {
        participant.status = ParticipantStatus.WITHDREW;
        expect(participant.isEliminated).toBe(true);
      });

      it('should return true for NO_SHOW status', () => {
        participant.status = ParticipantStatus.NO_SHOW;
        expect(participant.isEliminated).toBe(true);
      });

      it('should return false for ACTIVE status', () => {
        participant.status = ParticipantStatus.ACTIVE;
        expect(participant.isEliminated).toBe(false);
      });

      it('should return false for WINNER status', () => {
        participant.status = ParticipantStatus.WINNER;
        expect(participant.isEliminated).toBe(false);
      });
    });

    describe('mostPlayedMove', () => {
      it('should return ROCK when it is most played', () => {
        participant.rockPlayed = 10;
        participant.paperPlayed = 5;
        participant.scissorsPlayed = 3;
        expect(participant.mostPlayedMove).toBe('ROCK');
      });

      it('should return PAPER when it is most played', () => {
        participant.rockPlayed = 3;
        participant.paperPlayed = 12;
        participant.scissorsPlayed = 7;
        expect(participant.mostPlayedMove).toBe('PAPER');
      });

      it('should return SCISSORS when it is most played', () => {
        participant.rockPlayed = 2;
        participant.paperPlayed = 4;
        participant.scissorsPlayed = 15;
        expect(participant.mostPlayedMove).toBe('SCISSORS');
      });

      it('should return null when no moves played', () => {
        participant.rockPlayed = 0;
        participant.paperPlayed = 0;
        participant.scissorsPlayed = 0;
        expect(participant.mostPlayedMove).toBe(null);
      });

      it('should handle ties by returning first alphabetically', () => {
        participant.rockPlayed = 5;
        participant.paperPlayed = 5;
        participant.scissorsPlayed = 3;
        // Should return first one encountered with max count
        expect(['ROCK', 'PAPER']).toContain(participant.mostPlayedMove);
      });
    });

    describe('totalMoves', () => {
      it('should calculate total moves correctly', () => {
        participant.rockPlayed = 10;
        participant.paperPlayed = 8;
        participant.scissorsPlayed = 12;
        expect(participant.totalMoves).toBe(30);
      });

      it('should return 0 when no moves played', () => {
        expect(participant.totalMoves).toBe(0);
      });
    });

    describe('moveDistribution', () => {
      it('should calculate move distribution correctly', () => {
        participant.rockPlayed = 20;
        participant.paperPlayed = 50;
        participant.scissorsPlayed = 30;
        
        const distribution = participant.moveDistribution;
        expect(distribution.rock).toBe(20);
        expect(distribution.paper).toBe(50);
        expect(distribution.scissors).toBe(30);
      });

      it('should return all zeros when no moves played', () => {
        const distribution = participant.moveDistribution;
        expect(distribution.rock).toBe(0);
        expect(distribution.paper).toBe(0);
        expect(distribution.scissors).toBe(0);
      });

      it('should handle rounding correctly', () => {
        participant.rockPlayed = 1;
        participant.paperPlayed = 1;
        participant.scissorsPlayed = 1;
        
        const distribution = participant.moveDistribution;
        expect(distribution.rock).toBe(33);
        expect(distribution.paper).toBe(33);
        expect(distribution.scissors).toBe(33);
      });
    });
  });

  describe('Match Recording Methods', () => {
    describe('recordMatchResult', () => {
      it('should record a won match', () => {
        const gameResults = [
          { won: true, move: 'ROCK' as const },
          { won: false, move: 'PAPER' as const },
          { won: true, move: 'SCISSORS' as const },
        ];

        participant.recordMatchResult(true, gameResults);

        expect(participant.matchesPlayed).toBe(1);
        expect(participant.matchesWon).toBe(1);
        expect(participant.matchesLost).toBe(0);
        expect(participant.gamesPlayed).toBe(3);
        expect(participant.gamesWon).toBe(2);
        expect(participant.gamesLost).toBe(1);
        expect(participant.rockPlayed).toBe(1);
        expect(participant.paperPlayed).toBe(1);
        expect(participant.scissorsPlayed).toBe(1);
      });

      it('should record a lost match', () => {
        const gameResults = [
          { won: false, move: 'ROCK' as const },
          { won: false, move: 'PAPER' as const },
        ];

        participant.recordMatchResult(false, gameResults);

        expect(participant.matchesPlayed).toBe(1);
        expect(participant.matchesWon).toBe(0);
        expect(participant.matchesLost).toBe(1);
        expect(participant.gamesPlayed).toBe(2);
        expect(participant.gamesWon).toBe(0);
        expect(participant.gamesLost).toBe(2);
        expect(participant.rockPlayed).toBe(1);
        expect(participant.paperPlayed).toBe(1);
        expect(participant.scissorsPlayed).toBe(0);
      });

      it('should update average game time when total match time is set', () => {
        participant.totalMatchTime = 300; // 5 minutes
        
        const gameResults = [
          { won: true, move: 'ROCK' as const },
          { won: true, move: 'PAPER' as const },
        ];

        participant.recordMatchResult(true, gameResults);

        expect(participant.avgGameTime).toBe(150); // 300 / 2 games
      });

      it('should not update average game time when total match time is 0', () => {
        participant.totalMatchTime = 0;
        
        const gameResults = [
          { won: true, move: 'ROCK' as const },
        ];

        participant.recordMatchResult(true, gameResults);

        expect(participant.avgGameTime).toBeUndefined();
      });

      it('should handle multiple matches', () => {
        // First match
        participant.recordMatchResult(true, [
          { won: true, move: 'ROCK' as const },
          { won: true, move: 'PAPER' as const },
        ]);

        // Second match
        participant.recordMatchResult(false, [
          { won: false, move: 'SCISSORS' as const },
          { won: false, move: 'ROCK' as const },
          { won: true, move: 'PAPER' as const },
        ]);

        expect(participant.matchesPlayed).toBe(2);
        expect(participant.matchesWon).toBe(1);
        expect(participant.matchesLost).toBe(1);
        expect(participant.gamesPlayed).toBe(5);
        expect(participant.gamesWon).toBe(3);
        expect(participant.gamesLost).toBe(2);
        expect(participant.rockPlayed).toBe(2);
        expect(participant.paperPlayed).toBe(2);
        expect(participant.scissorsPlayed).toBe(1);
      });
    });
  });

  describe('Status Management Methods', () => {
    describe('eliminate', () => {
      it('should eliminate with default reason', () => {
        const beforeElimination = new Date();
        
        participant.eliminate();

        expect(participant.status).toBe(ParticipantStatus.ELIMINATED);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
        expect(participant.eliminatedAt!.getTime()).toBeGreaterThanOrEqual(beforeElimination.getTime());
      });

      it('should eliminate with "lost" reason', () => {
        participant.eliminate('lost');

        expect(participant.status).toBe(ParticipantStatus.ELIMINATED);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
      });

      it('should disqualify with "disqualified" reason', () => {
        participant.eliminate('disqualified');

        expect(participant.status).toBe(ParticipantStatus.DISQUALIFIED);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
      });

      it('should withdraw with "withdrew" reason', () => {
        participant.eliminate('withdrew');

        expect(participant.status).toBe(ParticipantStatus.WITHDREW);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
      });

      it('should set no show with "no_show" reason', () => {
        participant.eliminate('no_show');

        expect(participant.status).toBe(ParticipantStatus.NO_SHOW);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
      });
    });

    describe('setFinalPosition', () => {
      it('should set winner for position 1', () => {
        participant.setFinalPosition(1);

        expect(participant.finalPosition).toBe(1);
        expect(participant.status).toBe(ParticipantStatus.WINNER);
        expect(participant.eliminatedAt).toBeUndefined();
      });

      it('should eliminate active participant for non-winner position', () => {
        participant.status = ParticipantStatus.ACTIVE;
        const beforeElimination = new Date();
        
        participant.setFinalPosition(3);

        expect(participant.finalPosition).toBe(3);
        expect(participant.status).toBe(ParticipantStatus.ELIMINATED);
        expect(participant.eliminatedAt).toBeInstanceOf(Date);
        expect(participant.eliminatedAt!.getTime()).toBeGreaterThanOrEqual(beforeElimination.getTime());
      });

      it('should not change status if already eliminated', () => {
        participant.status = ParticipantStatus.DISQUALIFIED;
        participant.eliminatedAt = new Date(Date.now() - 3600000);
        
        participant.setFinalPosition(5);

        expect(participant.finalPosition).toBe(5);
        expect(participant.status).toBe(ParticipantStatus.DISQUALIFIED);
        expect(participant.eliminatedAt!.getTime()).toBeLessThan(Date.now() - 3600000 + 1000);
      });
    });
  });

  describe('Reward Management', () => {
    describe('awardPrize', () => {
      it('should award prize money', () => {
        participant.awardPrize(1000);
        expect(participant.prizeEarned).toBe(1000);
      });

      it('should overwrite previous prize', () => {
        participant.awardPrize(500);
        participant.awardPrize(1500);
        expect(participant.prizeEarned).toBe(1500);
      });
    });

    describe('addAchievement', () => {
      it('should add achievement', () => {
        const achievement = {
          id: 'first-win',
          name: 'First Victory',
          description: 'Won your first tournament match',
        };
        const beforeAdd = new Date();

        participant.addAchievement(achievement);

        expect(participant.achievements).toHaveLength(1);
        expect(participant.achievements![0]).toMatchObject({
          id: 'first-win',
          name: 'First Victory',
          description: 'Won your first tournament match',
        });
        expect(participant.achievements![0].earnedAt).toBeInstanceOf(Date);
        expect(participant.achievements![0].earnedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      });

      it('should not add duplicate achievement', () => {
        const achievement = {
          id: 'unique-achievement',
          name: 'Unique Achievement',
          description: 'This should only be added once',
        };

        participant.addAchievement(achievement);
        participant.addAchievement(achievement);

        expect(participant.achievements).toHaveLength(1);
      });

      it('should initialize achievements array if not exists', () => {
        participant.achievements = undefined;
        
        const achievement = {
          id: 'test',
          name: 'Test',
          description: 'Test achievement',
        };

        participant.addAchievement(achievement);

        expect(participant.achievements).toHaveLength(1);
      });

      it('should add multiple different achievements', () => {
        const achievements = [
          { id: 'ach1', name: 'Achievement 1', description: 'First achievement' },
          { id: 'ach2', name: 'Achievement 2', description: 'Second achievement' },
          { id: 'ach3', name: 'Achievement 3', description: 'Third achievement' },
        ];

        achievements.forEach(ach => participant.addAchievement(ach));

        expect(participant.achievements).toHaveLength(3);
        expect(participant.achievements!.map(a => a.id)).toEqual(['ach1', 'ach2', 'ach3']);
      });
    });
  });

  describe('Rating Management', () => {
    describe('updateRatingChange', () => {
      it('should calculate rating change correctly', () => {
        participant.startingRating = 1500;
        
        participant.updateRatingChange(1550);

        expect(participant.ratingChange).toBe(50);
      });

      it('should handle rating decrease', () => {
        participant.startingRating = 1500;
        
        participant.updateRatingChange(1450);

        expect(participant.ratingChange).toBe(-50);
      });

      it('should not update when no starting rating', () => {
        participant.startingRating = undefined;
        
        participant.updateRatingChange(1550);

        expect(participant.ratingChange).toBe(0);
      });
    });

    describe('calculatePerformanceRating', () => {
      beforeEach(() => {
        participant.gamesPlayed = 10;
        participant.gamesWon = 7;
      });

      it('should calculate performance rating', () => {
        const opponentRatings = [1400, 1500, 1600, 1450, 1550];
        
        participant.calculatePerformanceRating(opponentRatings);

        expect(participant.strengthOfSchedule).toBe(1500); // Average of opponent ratings
        expect(participant.performanceRating).toBeDefined();
        expect(typeof participant.performanceRating).toBe('number');
      });

      it('should handle empty opponent ratings', () => {
        participant.calculatePerformanceRating([]);

        expect(participant.strengthOfSchedule).toBeUndefined();
        expect(participant.performanceRating).toBeUndefined();
      });

      it('should handle single opponent', () => {
        const opponentRatings = [1550];
        
        participant.calculatePerformanceRating(opponentRatings);

        expect(participant.strengthOfSchedule).toBe(1550);
      });

      it('should handle perfect win rate', () => {
        participant.gamesPlayed = 5;
        participant.gamesWon = 5;
        const opponentRatings = [1500, 1500, 1500];
        
        participant.calculatePerformanceRating(opponentRatings);

        expect(participant.strengthOfSchedule).toBe(1500);
        expect(participant.performanceRating).toBeGreaterThan(1500);
      });

      it('should handle zero win rate', () => {
        participant.gamesPlayed = 5;
        participant.gamesWon = 0;
        const opponentRatings = [1500, 1500, 1500];
        
        participant.calculatePerformanceRating(opponentRatings);

        expect(participant.strengthOfSchedule).toBe(1500);
        expect(participant.performanceRating).toBeLessThan(1500);
      });
    });
  });

  describe('Summary Method', () => {
    describe('getSummary', () => {
      beforeEach(() => {
        participant.status = ParticipantStatus.ACTIVE;
        participant.seed = 3;
        participant.finalPosition = undefined;
        participant.matchesPlayed = 5;
        participant.matchesWon = 3;
        participant.gamesPlayed = 12;
        participant.gamesWon = 8;
        participant.rockPlayed = 4;
        participant.paperPlayed = 5;
        participant.scissorsPlayed = 3;
        participant.startingRating = 1500;
        participant.ratingChange = 25;
        participant.performanceRating = 1580;
        participant.strengthOfSchedule = 1550;
        participant.prizeEarned = 500;
        participant.achievements = [
          { id: 'ach1', name: 'Achievement 1', description: 'Test', earnedAt: new Date() },
          { id: 'ach2', name: 'Achievement 2', description: 'Test', earnedAt: new Date() },
        ];
      });

      it('should return comprehensive participant summary', () => {
        const summary = participant.getSummary();

        expect(summary).toMatchObject({
          user: {
            id: user.id,
            displayName: user.displayName,
            rating: user.eloRating,
          },
          tournament: {
            id: tournament.id,
            name: tournament.name,
          },
          status: {
            current: ParticipantStatus.ACTIVE,
            position: undefined,
            seed: 3,
          },
          performance: {
            matches: {
              played: 5,
              won: 3,
              winRate: 60, // 3/5 * 100, rounded
            },
            games: {
              played: 12,
              won: 8,
              winRate: 67, // 8/12 * 100, rounded
            },
            moves: {
              rock: 4,
              paper: 5,
              scissors: 3,
              mostPlayed: 'PAPER',
            },
          },
          ratings: {
            starting: 1500,
            change: 25,
            performance: 1580,
            strengthOfSchedule: 1550,
          },
          rewards: {
            prize: 500,
            achievements: 2,
          },
        });
      });

      it('should handle participant with no achievements', () => {
        participant.achievements = undefined;
        
        const summary = participant.getSummary();
        
        expect(summary.rewards.achievements).toBe(0);
      });

      it('should handle participant with no most played move', () => {
        participant.rockPlayed = 0;
        participant.paperPlayed = 0;
        participant.scissorsPlayed = 0;
        
        const summary = participant.getSummary();
        
        expect(summary.performance.moves.mostPlayed).toBeUndefined();
      });

      it('should handle winner participant', () => {
        participant.status = ParticipantStatus.WINNER;
        participant.finalPosition = 1;
        
        const summary = participant.getSummary();
        
        expect(summary.status.current).toBe(ParticipantStatus.WINNER);
        expect(summary.status.position).toBe(1);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero division in win rates', () => {
      participant.matchesPlayed = 0;
      participant.gamesPlayed = 0;
      
      expect(participant.matchWinRate).toBe(0);
      expect(participant.gameWinRate).toBe(0);
    });

    it('should handle very high numbers', () => {
      participant.matchesPlayed = 1000000;
      participant.matchesWon = 750000;
      
      expect(participant.matchWinRate).toBe(0.75);
    });

    it('should handle metadata operations', () => {
      participant.metadata = {
        preferences: { notifications: true, publicStats: false },
        specialConditions: ['left-handed'],
      };

      expect(participant.metadata.preferences?.notifications).toBe(true);
      expect(participant.metadata.specialConditions).toContain('left-handed');
    });

    it('should handle tiebreaker scores', () => {
      participant.tiebreakers = [10.5, 8.2, 15.7];
      
      expect(participant.tiebreakers).toHaveLength(3);
      expect(participant.tiebreakers![0]).toBe(10.5);
    });

    it('should handle complex move distribution edge case', () => {
      // Test case where rounding might cause issues
      participant.rockPlayed = 1;
      participant.paperPlayed = 1;
      participant.scissorsPlayed = 4;
      
      const distribution = participant.moveDistribution;
      
      // Total should roughly add up to 100%
      const total = distribution.rock + distribution.paper + distribution.scissors;
      expect(total).toBeGreaterThanOrEqual(99);
      expect(total).toBeLessThanOrEqual(101);
    });

    it('should handle performance rating calculation with extreme win rates', () => {
      // Test with very low win rate (avoid division by zero)
      participant.gamesPlayed = 100;
      participant.gamesWon = 1;
      
      const opponentRatings = [1500];
      
      expect(() => participant.calculatePerformanceRating(opponentRatings)).not.toThrow();
      expect(participant.performanceRating).toBeDefined();
    });

    it('should handle achievement management with null achievements', () => {
      participant.achievements = null as any;
      
      const achievement = { id: 'test', name: 'Test', description: 'Test' };
      
      expect(() => participant.addAchievement(achievement)).not.toThrow();
      expect(participant.achievements).toHaveLength(1);
    });
  });
});