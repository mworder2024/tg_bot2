import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { Tournament, TournamentStatus, TournamentFormat, TournamentVisibility } from '../tournament.entity';
import { User } from '../user.entity';
import { TournamentParticipant, ParticipantStatus } from '../tournament-participant.entity';
import { TournamentMatch, MatchStatus } from '../tournament-match.entity';

describe('Tournament Entity (Corrected)', () => {
  let module: TestingModule;
  let tournament: Tournament;
  let organizer: User;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [],
    }).compile();

    // Create test organizer
    organizer = new User();
    organizer.id = 'organizer-id';
    organizer.telegramId = 12345;
    organizer.username = 'organizer';
    organizer.firstName = 'Tournament';
    organizer.lastName = 'Organizer';
    organizer.eloRating = 1600;

    // Create test tournament
    tournament = new Tournament();
    tournament.id = 'tournament-id';
    tournament.name = 'Test Tournament';
    tournament.description = 'A test tournament for unit testing';
    tournament.format = TournamentFormat.SINGLE_ELIMINATION;
    tournament.status = TournamentStatus.REGISTRATION;
    tournament.visibility = TournamentVisibility.PUBLIC;
    tournament.maxParticipants = 16;
    tournament.minParticipants = 4;
    tournament.currentParticipants = 0;
    tournament.roundsPerMatch = 3;
    tournament.moveTimeoutSeconds = 60;
    tournament.matchTimeoutMinutes = 10;
    tournament.createdBy = organizer;
    tournament.currentRound = 0;
    tournament.registrationEndTime = new Date(Date.now() + 86400000); // Tomorrow
    tournament.startTime = new Date(Date.now() + 2 * 86400000); // Day after tomorrow
    tournament.settings = {
      allowSpectators: true,
      enableChat: true,
      showBracket: true,
      autoStart: false,
      sendReminders: true,
      recordGames: true,
      streamEnabled: false,
    };
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Entity Validation', () => {
    it('should validate a valid tournament', async () => {
      const errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should require name', async () => {
      tournament.name = '';
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate name length', async () => {
      tournament.name = 'A'.repeat(256); // Too long
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.name = 'AB'; // Too short
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.name = 'Valid Tournament Name';
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should validate description length when provided', async () => {
      tournament.description = 'A'.repeat(2001); // Too long
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate format is valid enum value', async () => {
      tournament.format = 'INVALID_FORMAT' as any;
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate status is valid enum value', async () => {
      tournament.status = 'INVALID_STATUS' as any;
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate visibility is valid enum value', async () => {
      tournament.visibility = 'INVALID_VISIBILITY' as any;
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate maxParticipants range', async () => {
      tournament.maxParticipants = 1; // Too low
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.maxParticipants = 257; // Too high
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.maxParticipants = 16;
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should validate minParticipants range', async () => {
      tournament.minParticipants = 1; // Too low
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.minParticipants = 4;
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should validate non-negative numeric fields', async () => {
      const numericFields = [
        'currentParticipants', 'currentRound', 'roundsPerMatch',
        'moveTimeoutSeconds', 'matchTimeoutMinutes'
      ];

      for (const field of numericFields) {
        (tournament as any)[field] = -1;
        const errors = await validate(tournament);
        expect(errors.length).toBeGreaterThan(0);
        
        // Reset to valid value
        if (field === 'roundsPerMatch') {
          (tournament as any)[field] = 3;
        } else if (field === 'moveTimeoutSeconds') {
          (tournament as any)[field] = 60;
        } else if (field === 'matchTimeoutMinutes') {
          (tournament as any)[field] = 10;
        } else {
          (tournament as any)[field] = 0;
        }
      }
    });

    it('should validate rating range fields when provided', async () => {
      tournament.minRating = -100;
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.minRating = 1200;
      tournament.maxRating = -100;
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.maxRating = 1800;
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should validate timeouts are within valid ranges', async () => {
      tournament.moveTimeoutSeconds = 5; // Too low
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.moveTimeoutSeconds = 400; // Too high
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.moveTimeoutSeconds = 60;
      tournament.matchTimeoutMinutes = 3; // Too low
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.matchTimeoutMinutes = 70; // Too high
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.matchTimeoutMinutes = 10;
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    describe('isRegistrationOpen', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.REGISTRATION;
        tournament.currentParticipants = 5;
        tournament.maxParticipants = 16;
        tournament.registrationEndTime = new Date(Date.now() + 3600000); // 1 hour from now
      });

      it('should return true when all conditions are met', () => {
        expect(tournament.isRegistrationOpen).toBe(true);
      });

      it('should return false when status is not REGISTRATION', () => {
        tournament.status = TournamentStatus.ACTIVE;
        expect(tournament.isRegistrationOpen).toBe(false);
      });

      it('should return false when tournament is full', () => {
        tournament.currentParticipants = 16;
        expect(tournament.isRegistrationOpen).toBe(false);
      });

      it('should return false when registration deadline has passed', () => {
        tournament.registrationEndTime = new Date(Date.now() - 3600000); // 1 hour ago
        expect(tournament.isRegistrationOpen).toBe(false);
      });

      it('should return true when no registration deadline is set', () => {
        tournament.registrationEndTime = undefined;
        expect(tournament.isRegistrationOpen).toBe(true);
      });
    });

    describe('canStart', () => {
      it('should return true when status is READY and enough participants', () => {
        tournament.status = TournamentStatus.READY;
        tournament.currentParticipants = 8;
        tournament.minParticipants = 4;
        expect(tournament.canStart).toBe(true);
      });

      it('should return false when status is not READY', () => {
        tournament.status = TournamentStatus.REGISTRATION;
        tournament.currentParticipants = 8;
        expect(tournament.canStart).toBe(false);
      });

      it('should return false when not enough participants', () => {
        tournament.status = TournamentStatus.READY;
        tournament.currentParticipants = 2;
        tournament.minParticipants = 4;
        expect(tournament.canStart).toBe(false);
      });
    });

    describe('isActive', () => {
      it('should return true when status is ACTIVE', () => {
        tournament.status = TournamentStatus.ACTIVE;
        expect(tournament.isActive).toBe(true);
      });

      it('should return false when status is not ACTIVE', () => {
        tournament.status = TournamentStatus.COMPLETED;
        expect(tournament.isActive).toBe(false);
      });
    });

    describe('isCompleted', () => {
      it('should return true when status is COMPLETED', () => {
        tournament.status = TournamentStatus.COMPLETED;
        expect(tournament.isCompleted).toBe(true);
      });

      it('should return false when status is not COMPLETED', () => {
        tournament.status = TournamentStatus.ACTIVE;
        expect(tournament.isCompleted).toBe(false);
      });
    });

    describe('fillPercentage', () => {
      it('should calculate fill percentage correctly', () => {
        tournament.currentParticipants = 12;
        tournament.maxParticipants = 16;
        expect(tournament.fillPercentage).toBe(75);
      });

      it('should handle zero participants', () => {
        tournament.currentParticipants = 0;
        tournament.maxParticipants = 16;
        expect(tournament.fillPercentage).toBe(0);
      });

      it('should handle full tournament', () => {
        tournament.currentParticipants = 16;
        tournament.maxParticipants = 16;
        expect(tournament.fillPercentage).toBe(100);
      });
    });

    describe('estimatedDuration', () => {
      it('should calculate duration for single elimination', () => {
        tournament.format = TournamentFormat.SINGLE_ELIMINATION;
        tournament.currentParticipants = 8;
        
        const duration = tournament.estimatedDuration;
        expect(duration).toBeGreaterThan(0);
        expect(typeof duration).toBe('number');
      });

      it('should calculate duration for round robin', () => {
        tournament.format = TournamentFormat.ROUND_ROBIN;
        tournament.currentParticipants = 4;
        
        const duration = tournament.estimatedDuration;
        expect(duration).toBe(30); // (4 * 3) / 2 * 5 minutes = 30 minutes
      });

      it('should handle other formats', () => {
        tournament.format = TournamentFormat.SWISS_SYSTEM;
        tournament.currentParticipants = 8;
        
        const duration = tournament.estimatedDuration;
        expect(duration).toBe(40); // 8 * 5 minutes = 40 minutes
      });
    });

    describe('currentPhase', () => {
      it('should return "Tournament Complete" when completed', () => {
        tournament.status = TournamentStatus.COMPLETED;
        expect(tournament.currentPhase).toBe('Tournament Complete');
      });

      it('should return formatted status when not active', () => {
        tournament.status = TournamentStatus.REGISTRATION;
        expect(tournament.currentPhase).toBe('registration');
      });

      it('should return "In Progress" when active but no total rounds', () => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.totalRounds = undefined;
        expect(tournament.currentPhase).toBe('In Progress');
      });

      it('should return specific round names', () => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.totalRounds = 3;
        tournament.currentRound = 3;
        expect(tournament.currentPhase).toBe('First Round'); // totalRounds - currentRound = 0

        tournament.currentRound = 2;
        expect(tournament.currentPhase).toBe('Second Round'); // totalRounds - currentRound = 1
      });

      it('should return generic round number for large tournaments', () => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.totalRounds = 10;
        tournament.currentRound = 5;
        expect(tournament.currentPhase).toBe('Round 5');
      });
    });
  });

  describe('User Participation Methods', () => {
    let testUser: User;

    beforeEach(() => {
      testUser = new User();
      testUser.id = 'test-user-id';
      testUser.telegramId = 54321;
      testUser.username = 'testuser';
      testUser.firstName = 'Test';
      testUser.lastName = 'User';
      testUser.eloRating = 1500;

      tournament.status = TournamentStatus.REGISTRATION;
      tournament.currentParticipants = 5;
      tournament.maxParticipants = 16;
      tournament.registrationEndTime = new Date(Date.now() + 3600000);
    });

    describe('canUserJoin', () => {
      it('should allow user to join when all conditions are met', () => {
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should prevent join when registration is closed', () => {
        tournament.status = TournamentStatus.ACTIVE;
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(false);
        expect(result.reason).toBe('Registration is closed');
      });

      it('should prevent join when tournament is full', () => {
        tournament.currentParticipants = 16;
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(false);
        expect(result.reason).toBe('Tournament is full');
      });

      it('should prevent join when user rating is too low', () => {
        tournament.minRating = 1600;
        testUser.eloRating = 1400;
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(false);
        expect(result.reason).toBe('Minimum rating required: 1600');
      });

      it('should prevent join when user rating is too high', () => {
        tournament.maxRating = 1400;
        testUser.eloRating = 1600;
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(false);
        expect(result.reason).toBe('Maximum rating allowed: 1400');
      });

      it('should allow join when rating is within range', () => {
        tournament.minRating = 1200;
        tournament.maxRating = 1800;
        testUser.eloRating = 1500;
        const result = tournament.canUserJoin(testUser);
        expect(result.canJoin).toBe(true);
      });
    });

    describe('addParticipant', () => {
      it('should add participant when conditions are met', () => {
        const initialCount = tournament.currentParticipants;
        
        tournament.addParticipant(testUser);
        
        expect(tournament.currentParticipants).toBe(initialCount + 1);
      });

      it('should change status to READY when minimum participants reached', () => {
        tournament.currentParticipants = 3;
        tournament.minParticipants = 4;
        tournament.status = TournamentStatus.REGISTRATION;
        
        tournament.addParticipant(testUser);
        
        expect(tournament.status).toBe(TournamentStatus.READY);
      });

      it('should throw error when user cannot join', () => {
        tournament.currentParticipants = 16; // Full
        
        expect(() => tournament.addParticipant(testUser)).toThrow('Tournament is full');
      });
    });

    describe('removeParticipant', () => {
      it('should decrease participant count', () => {
        tournament.currentParticipants = 6;
        
        tournament.removeParticipant();
        
        expect(tournament.currentParticipants).toBe(5);
      });

      it('should not go below zero', () => {
        tournament.currentParticipants = 0;
        
        tournament.removeParticipant();
        
        expect(tournament.currentParticipants).toBe(0);
      });

      it('should revert status to REGISTRATION when below minimum', () => {
        tournament.currentParticipants = 4;
        tournament.minParticipants = 4;
        tournament.status = TournamentStatus.READY;
        
        tournament.removeParticipant();
        
        expect(tournament.status).toBe(TournamentStatus.REGISTRATION);
        expect(tournament.currentParticipants).toBe(3);
      });
    });
  });

  describe('Tournament Lifecycle Methods', () => {
    describe('start', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.READY;
        tournament.currentParticipants = 8;
        tournament.minParticipants = 4;
      });

      it('should start tournament successfully', () => {
        const beforeStart = new Date();
        
        tournament.start();
        
        expect(tournament.status).toBe(TournamentStatus.ACTIVE);
        expect(tournament.actualStartTime).toBeInstanceOf(Date);
        expect(tournament.actualStartTime!.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
        expect(tournament.currentRound).toBe(1);
        expect(tournament.totalRounds).toBeDefined();
      });

      it('should calculate total rounds for single elimination', () => {
        tournament.format = TournamentFormat.SINGLE_ELIMINATION;
        tournament.currentParticipants = 8;
        
        tournament.start();
        
        expect(tournament.totalRounds).toBe(3); // Math.ceil(log2(8)) = 3
      });

      it('should calculate total rounds for round robin', () => {
        tournament.format = TournamentFormat.ROUND_ROBIN;
        tournament.currentParticipants = 6;
        
        tournament.start();
        
        expect(tournament.totalRounds).toBe(5); // n - 1 = 5
      });

      it('should calculate total rounds for double elimination', () => {
        tournament.format = TournamentFormat.DOUBLE_ELIMINATION;
        tournament.currentParticipants = 8;
        
        tournament.start();
        
        expect(tournament.totalRounds).toBe(5); // Math.ceil(log2(8)) * 2 - 1 = 5
      });

      it('should throw error when cannot start', () => {
        tournament.status = TournamentStatus.REGISTRATION;
        
        expect(() => tournament.start()).toThrow('Tournament cannot be started');
      });
    });

    describe('complete', () => {
      let winner: User;
      let runnerUp: User;

      beforeEach(() => {
        winner = new User();
        winner.id = 'winner-id';
        winner.username = 'winner';
        winner.displayName = 'Tournament Winner';

        runnerUp = new User();
        runnerUp.id = 'runner-up-id';
        runnerUp.username = 'runnerup';
        runnerUp.displayName = 'Runner Up';

        tournament.status = TournamentStatus.ACTIVE;
      });

      it('should complete tournament with winner', () => {
        const beforeComplete = new Date();
        
        tournament.complete(winner);
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.winner).toBe(winner);
        expect(tournament.endTime).toBeInstanceOf(Date);
        expect(tournament.endTime!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      });

      it('should complete tournament with winner and runner-up', () => {
        tournament.complete(winner, runnerUp);
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.winner).toBe(winner);
        expect(tournament.runnerUp).toBe(runnerUp);
        expect(tournament.endTime).toBeInstanceOf(Date);
      });

      it('should complete tournament without winner', () => {
        tournament.complete();
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.winner).toBeUndefined();
        expect(tournament.runnerUp).toBeUndefined();
        expect(tournament.endTime).toBeInstanceOf(Date);
      });
    });

    describe('cancel', () => {
      it('should cancel tournament', () => {
        tournament.cancel();
        
        expect(tournament.status).toBe(TournamentStatus.CANCELLED);
      });

      it('should cancel tournament with reason', () => {
        tournament.cancel('Not enough participants');
        
        expect(tournament.status).toBe(TournamentStatus.CANCELLED);
        expect(tournament.settings).toBeDefined();
        expect((tournament.settings as any).cancellationReason).toBe('Not enough participants');
      });

      it('should initialize settings if not exists when adding reason', () => {
        tournament.settings = undefined;
        
        tournament.cancel('Test reason');
        
        expect(tournament.settings).toBeDefined();
        expect(tournament.settings?.allowSpectators).toBe(true);
        expect((tournament.settings as any).cancellationReason).toBe('Test reason');
      });
    });

    describe('pause', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.ACTIVE;
      });

      it('should pause active tournament', () => {
        tournament.pause();
        
        expect(tournament.status).toBe(TournamentStatus.PAUSED);
      });

      it('should pause tournament with reason', () => {
        tournament.pause('Technical difficulties');
        
        expect(tournament.status).toBe(TournamentStatus.PAUSED);
        expect((tournament.settings as any).pauseReason).toBe('Technical difficulties');
      });

      it('should throw error if tournament is not active', () => {
        tournament.status = TournamentStatus.REGISTRATION;
        
        expect(() => tournament.pause()).toThrow('Can only pause active tournaments');
      });
    });

    describe('resume', () => {
      it('should resume paused tournament', () => {
        tournament.status = TournamentStatus.PAUSED;
        
        tournament.resume();
        
        expect(tournament.status).toBe(TournamentStatus.ACTIVE);
      });

      it('should throw error if tournament is not paused', () => {
        tournament.status = TournamentStatus.ACTIVE;
        
        expect(() => tournament.resume()).toThrow('Can only resume paused tournaments');
      });
    });

    describe('nextRound', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.currentRound = 1;
      });

      it('should advance to next round', () => {
        tournament.nextRound();
        
        expect(tournament.currentRound).toBe(2);
      });

      it('should throw error if tournament is not active', () => {
        tournament.status = TournamentStatus.COMPLETED;
        
        expect(() => tournament.nextRound()).toThrow('Tournament is not active');
      });
    });
  });

  describe('Moderator Management', () => {
    const moderatorId = 'moderator-id';
    const organizerId = 'organizer-id';

    beforeEach(() => {
      tournament.createdBy.id = organizerId;
    });

    describe('isModerator', () => {
      it('should return true for tournament creator', () => {
        expect(tournament.isModerator(organizerId)).toBe(true);
      });

      it('should return true for added moderator', () => {
        tournament.moderators = [moderatorId];
        expect(tournament.isModerator(moderatorId)).toBe(true);
      });

      it('should return false for non-moderator', () => {
        expect(tournament.isModerator('random-user-id')).toBe(false);
      });

      it('should handle undefined moderators', () => {
        tournament.moderators = undefined;
        expect(tournament.isModerator(moderatorId)).toBe(false);
      });
    });

    describe('addModerator', () => {
      it('should add moderator to empty list', () => {
        tournament.moderators = undefined;
        
        tournament.addModerator(moderatorId);
        
        expect(tournament.moderators).toContain(moderatorId);
      });

      it('should add moderator to existing list', () => {
        tournament.moderators = ['existing-mod'];
        
        tournament.addModerator(moderatorId);
        
        expect(tournament.moderators).toContain(moderatorId);
        expect(tournament.moderators).toContain('existing-mod');
      });

      it('should not add duplicate moderator', () => {
        tournament.moderators = [moderatorId];
        
        tournament.addModerator(moderatorId);
        
        expect(tournament.moderators.filter(id => id === moderatorId)).toHaveLength(1);
      });
    });

    describe('removeModerator', () => {
      it('should remove moderator from list', () => {
        tournament.moderators = [moderatorId, 'other-mod'];
        
        tournament.removeModerator(moderatorId);
        
        expect(tournament.moderators).not.toContain(moderatorId);
        expect(tournament.moderators).toContain('other-mod');
      });

      it('should handle removal from empty list', () => {
        tournament.moderators = undefined;
        
        expect(() => tournament.removeModerator(moderatorId)).not.toThrow();
      });

      it('should handle removal of non-existent moderator', () => {
        tournament.moderators = ['other-mod'];
        
        tournament.removeModerator('non-existent');
        
        expect(tournament.moderators).toEqual(['other-mod']);
      });
    });
  });

  describe('Summary Method', () => {
    beforeEach(() => {
      tournament.status = TournamentStatus.ACTIVE;
      tournament.currentParticipants = 12;
      tournament.maxParticipants = 16;
      tournament.registrationEndTime = new Date();
      tournament.startTime = new Date();
      tournament.winner = organizer;
      tournament.runnerUp = organizer;
    });

    it('should return comprehensive tournament summary', () => {
      const summary = tournament.getSummary();
      
      expect(summary).toMatchObject({
        basic: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          format: tournament.format,
        },
        participants: {
          current: 12,
          max: 16,
          fillPercentage: 75,
        },
        settings: {
          roundsPerMatch: tournament.roundsPerMatch,
          moveTimeout: tournament.moveTimeoutSeconds,
          visibility: tournament.visibility,
        },
      });
      
      expect(summary.timing.registrationEnd).toBeInstanceOf(Date);
      expect(summary.timing.startTime).toBeInstanceOf(Date);
      expect(typeof summary.timing.estimatedDuration).toBe('number');
      expect(summary.results).toBeDefined();
      expect(summary.results?.winner).toBe(organizer.displayName);
      expect(summary.results?.runnerUp).toBe(organizer.displayName);
      expect(typeof summary.results?.currentPhase).toBe('string');
    });

    it('should handle tournament without results when not active/completed', () => {
      tournament.status = TournamentStatus.REGISTRATION;
      
      const summary = tournament.getSummary();
      
      expect(summary.results).toBeUndefined();
    });

    it('should handle tournament with no winner/runner-up', () => {
      tournament.winner = undefined;
      tournament.runnerUp = undefined;
      
      const summary = tournament.getSummary();
      
      expect(summary.results?.winner).toBeUndefined();
      expect(summary.results?.runnerUp).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle large tournaments', () => {
      tournament.currentParticipants = 128;
      tournament.maxParticipants = 256;
      tournament.format = TournamentFormat.SINGLE_ELIMINATION;
      
      expect(tournament.fillPercentage).toBe(50);
      expect(tournament.estimatedDuration).toBeGreaterThan(0);
    });

    it('should handle tournament with complex prize pool', () => {
      tournament.prizePool = {
        total: 1000,
        currency: 'USD',
        distribution: {
          first: 50,
          second: 30,
          third: 20,
        },
      };
      
      expect(tournament.prizePool.total).toBe(1000);
      expect(tournament.prizePool.distribution.first).toBe(50);
    });

    it('should handle tournament statistics', () => {
      tournament.statistics = {
        totalGames: 150,
        totalMoves: 450,
        averageGameDuration: 120,
        mostUsedMove: 'ROCK',
        upsets: 5,
        perfectGames: 100,
        longestGame: 300,
        shortestGame: 30,
      };
      
      expect(tournament.statistics.totalGames).toBe(150);
      expect(tournament.statistics.mostUsedMove).toBe('ROCK');
    });

    it('should handle tournament tags', () => {
      tournament.tags = ['beginner', 'quick', 'casual'];
      
      expect(tournament.tags).toContain('beginner');
      expect(tournament.tags).toHaveLength(3);
    });

    it('should handle minimum participants equal to current participants', () => {
      tournament.currentParticipants = 4;
      tournament.minParticipants = 4;
      tournament.status = TournamentStatus.READY;
      
      expect(tournament.canStart).toBe(true);
      
      tournament.removeParticipant();
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION);
    });

    it('should handle tournaments with no time limits', () => {
      tournament.registrationEndTime = undefined;
      tournament.startTime = undefined;
      
      const summary = tournament.getSummary();
      
      expect(summary.timing.registrationEnd).toBeUndefined();
      expect(summary.timing.startTime).toBeUndefined();
    });

    it('should handle rating requirements at boundaries', () => {
      const user = new User();
      user.eloRating = 1500;
      
      tournament.minRating = 1500;
      tournament.maxRating = 1500;
      
      const result = tournament.canUserJoin(user);
      expect(result.canJoin).toBe(true);
    });

    it('should handle very small tournaments', () => {
      tournament.currentParticipants = 2;
      tournament.minParticipants = 2;
      tournament.maxParticipants = 2;
      tournament.format = TournamentFormat.SINGLE_ELIMINATION;
      
      tournament['calculateTotalRounds']();
      
      expect(tournament.totalRounds).toBe(1); // Math.ceil(log2(2)) = 1
    });

    it('should handle zero participant edge case', () => {
      tournament.currentParticipants = 0;
      tournament.maxParticipants = 16;
      
      expect(tournament.fillPercentage).toBe(0);
      expect(tournament.estimatedDuration).toBe(0);
    });
  });
});