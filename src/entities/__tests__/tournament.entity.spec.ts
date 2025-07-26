import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { Tournament, TournamentStatus, TournamentFormat } from '../tournament.entity';
import { User } from '../user.entity';
import { TournamentParticipant, ParticipantStatus } from '../tournament-participant.entity';
import { TournamentMatch, MatchStatus } from '../tournament-match.entity';

describe('Tournament Entity', () => {
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
    organizer.isAdmin = true;

    // Create test tournament
    tournament = new Tournament();
    tournament.id = 'tournament-id';
    tournament.name = 'Test Tournament';
    tournament.description = 'A test tournament for unit testing';
    tournament.format = TournamentFormat.SINGLE_ELIMINATION;
    tournament.status = TournamentStatus.REGISTRATION_OPEN;
    tournament.maxPlayers = 16;
    tournament.organizerId = organizer.id;
    tournament.organizer = organizer;
    tournament.entryFee = 10;
    tournament.prizePool = 100;
    tournament.registrationDeadline = new Date(Date.now() + 86400000); // Tomorrow
    tournament.startDate = new Date(Date.now() + 2 * 86400000); // Day after tomorrow
    tournament.endDate = new Date(Date.now() + 7 * 86400000); // Next week
    tournament.currentRound = 0;
    tournament.totalRounds = 4;
    tournament.playersCount = 0;
    tournament.isPublic = true;
    tournament.autoStart = true;
    tournament.settings = {
      bestOf: 3,
      timeLimit: 300,
      allowSpectators: true,
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
      tournament.name = 'A'.repeat(101); // Too long
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
      tournament.description = 'A'.repeat(1001); // Too long
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

    it('should validate maxPlayers range', async () => {
      tournament.maxPlayers = 1; // Too low
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.maxPlayers = 257; // Too high
      errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.maxPlayers = 16;
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should require organizerId', async () => {
      tournament.organizerId = '';
      const errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate non-negative numeric fields', async () => {
      const numericFields = [
        'entryFee', 'prizePool', 'currentRound', 
        'totalRounds', 'playersCount'
      ];

      for (const field of numericFields) {
        (tournament as any)[field] = -1;
        const errors = await validate(tournament);
        expect(errors.length).toBeGreaterThan(0);
        (tournament as any)[field] = 0;
      }
    });

    it('should validate date fields', async () => {
      tournament.registrationDeadline = new Date();
      tournament.startDate = new Date();
      tournament.endDate = new Date();
      tournament.actualStartTime = new Date();
      tournament.completedAt = new Date();
      
      const errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });

    it('should validate passwords when provided', async () => {
      tournament.password = 'ab'; // Too short
      let errors = await validate(tournament);
      expect(errors.length).toBeGreaterThan(0);

      tournament.password = 'validpassword';
      errors = await validate(tournament);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    describe('isRegistrationOpen', () => {
      it('should return true when status is REGISTRATION_OPEN', () => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        expect(tournament.isRegistrationOpen).toBe(true);
      });

      it('should return false when status is not REGISTRATION_OPEN', () => {
        tournament.status = TournamentStatus.ACTIVE;
        expect(tournament.isRegistrationOpen).toBe(false);
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

    describe('isFull', () => {
      it('should return true when players count equals max players', () => {
        tournament.maxPlayers = 8;
        tournament.playersCount = 8;
        expect(tournament.isFull).toBe(true);
      });

      it('should return false when players count is less than max players', () => {
        tournament.maxPlayers = 8;
        tournament.playersCount = 6;
        expect(tournament.isFull).toBe(false);
      });
    });

    describe('hasStarted', () => {
      it('should return true when actualStartTime is set', () => {
        tournament.actualStartTime = new Date();
        expect(tournament.hasStarted).toBe(true);
      });

      it('should return false when actualStartTime is not set', () => {
        tournament.actualStartTime = undefined;
        expect(tournament.hasStarted).toBe(false);
      });
    });

    describe('duration', () => {
      it('should calculate duration when tournament is completed', () => {
        tournament.actualStartTime = new Date(2023, 0, 1, 10, 0, 0);
        tournament.completedAt = new Date(2023, 0, 1, 12, 30, 0);
        
        expect(tournament.duration).toBe(9000); // 2.5 hours in seconds
      });

      it('should return null when tournament is not started', () => {
        tournament.actualStartTime = undefined;
        tournament.completedAt = new Date();
        
        expect(tournament.duration).toBe(null);
      });

      it('should return null when tournament is not completed', () => {
        tournament.actualStartTime = new Date();
        tournament.completedAt = undefined;
        
        expect(tournament.duration).toBe(null);
      });
    });

    describe('formattedDuration', () => {
      it('should format duration correctly', () => {
        tournament.actualStartTime = new Date(2023, 0, 1, 10, 0, 0);
        tournament.completedAt = new Date(2023, 0, 1, 12, 30, 15);
        
        expect(tournament.formattedDuration).toBe('2h 30m 15s');
      });

      it('should return N/A when no duration', () => {
        tournament.actualStartTime = undefined;
        tournament.completedAt = undefined;
        
        expect(tournament.formattedDuration).toBe('N/A');
      });

      it('should format minutes and seconds only', () => {
        tournament.actualStartTime = new Date(2023, 0, 1, 10, 0, 0);
        tournament.completedAt = new Date(2023, 0, 1, 10, 5, 30);
        
        expect(tournament.formattedDuration).toBe('5m 30s');
      });

      it('should format seconds only', () => {
        tournament.actualStartTime = new Date(2023, 0, 1, 10, 0, 0);
        tournament.completedAt = new Date(2023, 0, 1, 10, 0, 45);
        
        expect(tournament.formattedDuration).toBe('45s');
      });
    });

    describe('progress', () => {
      it('should calculate progress correctly', () => {
        tournament.totalRounds = 4;
        tournament.currentRound = 2;
        
        expect(tournament.progress).toBe(50);
      });

      it('should return 0 when no rounds', () => {
        tournament.totalRounds = 0;
        tournament.currentRound = 0;
        
        expect(tournament.progress).toBe(0);
      });

      it('should return 100 when completed', () => {
        tournament.totalRounds = 4;
        tournament.currentRound = 4;
        
        expect(tournament.progress).toBe(100);
      });
    });

    describe('isRegistrationDeadlinePassed', () => {
      it('should return true when deadline has passed', () => {
        tournament.registrationDeadline = new Date(Date.now() - 3600000); // 1 hour ago
        expect(tournament.isRegistrationDeadlinePassed).toBe(true);
      });

      it('should return false when deadline has not passed', () => {
        tournament.registrationDeadline = new Date(Date.now() + 3600000); // 1 hour from now
        expect(tournament.isRegistrationDeadlinePassed).toBe(false);
      });

      it('should return false when no deadline is set', () => {
        tournament.registrationDeadline = undefined;
        expect(tournament.isRegistrationDeadlinePassed).toBe(false);
      });
    });

    describe('canRegister', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        tournament.maxPlayers = 16;
        tournament.playersCount = 10;
        tournament.registrationDeadline = new Date(Date.now() + 3600000); // 1 hour from now
      });

      it('should return true when all conditions are met', () => {
        expect(tournament.canRegister).toBe(true);
      });

      it('should return false when registration is closed', () => {
        tournament.status = TournamentStatus.ACTIVE;
        expect(tournament.canRegister).toBe(false);
      });

      it('should return false when tournament is full', () => {
        tournament.playersCount = 16;
        expect(tournament.canRegister).toBe(false);
      });

      it('should return false when deadline has passed', () => {
        tournament.registrationDeadline = new Date(Date.now() - 3600000);
        expect(tournament.canRegister).toBe(false);
      });
    });
  });

  describe('Tournament Management Methods', () => {
    let participants: TournamentParticipant[];
    let users: User[];

    beforeEach(() => {
      // Create test users
      users = [];
      for (let i = 1; i <= 8; i++) {
        const user = new User();
        user.id = `user-${i}`;
        user.telegramId = 10000 + i;
        user.username = `player${i}`;
        user.firstName = `Player${i}`;
        user.eloRating = 1400 + (i * 25);
        users.push(user);
      }

      // Create test participants
      participants = [];
      users.forEach((user, index) => {
        const participant = new TournamentParticipant();
        participant.id = `participant-${index + 1}`;
        participant.user = user;
        participant.tournament = tournament;
        participant.status = ParticipantStatus.REGISTERED;
        participant.registeredAt = new Date();
        participants.push(participant);
      });

      tournament.participants = participants;
      tournament.playersCount = participants.length;
    });

    describe('start', () => {
      it('should start tournament successfully', () => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        const beforeStart = new Date();
        
        tournament.start();
        
        expect(tournament.status).toBe(TournamentStatus.ACTIVE);
        expect(tournament.actualStartTime).toBeInstanceOf(Date);
        expect(tournament.actualStartTime!.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
        expect(tournament.currentRound).toBe(1);
      });

      it('should throw error if not in registration open status', () => {
        tournament.status = TournamentStatus.ACTIVE;
        
        expect(() => tournament.start()).toThrow('Tournament is not in registration phase');
      });

      it('should throw error if not enough players', () => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        tournament.participants = [];
        tournament.playersCount = 0;
        
        expect(() => tournament.start()).toThrow('Not enough players to start tournament');
      });
    });

    describe('complete', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.actualStartTime = new Date();
      });

      it('should complete tournament with winner', () => {
        const winner = users[0];
        const beforeComplete = new Date();
        
        tournament.complete(winner);
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.winner).toBe(winner);
        expect(tournament.completedAt).toBeInstanceOf(Date);
        expect(tournament.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      });

      it('should complete tournament without winner', () => {
        tournament.complete();
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.winner).toBeUndefined();
        expect(tournament.completedAt).toBeInstanceOf(Date);
      });

      it('should throw error if tournament is not active', () => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        
        expect(() => tournament.complete()).toThrow('Tournament is not active');
      });
    });

    describe('cancel', () => {
      it('should cancel tournament with reason', () => {
        tournament.cancel('Not enough participants');
        
        expect(tournament.status).toBe(TournamentStatus.CANCELLED);
        expect(tournament.notes).toBe('Cancelled: Not enough participants');
      });

      it('should cancel tournament without reason', () => {
        tournament.cancel();
        
        expect(tournament.status).toBe(TournamentStatus.CANCELLED);
        expect(tournament.notes).toBeUndefined();
      });

      it('should throw error if tournament is already completed', () => {
        tournament.status = TournamentStatus.COMPLETED;
        
        expect(() => tournament.cancel()).toThrow('Tournament is already completed');
      });
    });

    describe('postpone', () => {
      it('should postpone tournament with new start date and reason', () => {
        const newStartDate = new Date(Date.now() + 2 * 86400000); // Two days from now
        
        tournament.postpone(newStartDate, 'Technical difficulties');
        
        expect(tournament.status).toBe(TournamentStatus.POSTPONED);
        expect(tournament.startDate).toBe(newStartDate);
        expect(tournament.notes).toBe('Postponed: Technical difficulties');
      });

      it('should postpone tournament without new date', () => {
        tournament.postpone(undefined, 'Weather delay');
        
        expect(tournament.status).toBe(TournamentStatus.POSTPONED);
        expect(tournament.notes).toBe('Postponed: Weather delay');
      });
    });

    describe('resume', () => {
      it('should resume postponed tournament to registration', () => {
        tournament.status = TournamentStatus.POSTPONED;
        tournament.actualStartTime = undefined;
        
        tournament.resume();
        
        expect(tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);
      });

      it('should resume postponed tournament to active', () => {
        tournament.status = TournamentStatus.POSTPONED;
        tournament.actualStartTime = new Date();
        
        tournament.resume();
        
        expect(tournament.status).toBe(TournamentStatus.ACTIVE);
      });

      it('should throw error if tournament is not postponed', () => {
        tournament.status = TournamentStatus.ACTIVE;
        
        expect(() => tournament.resume()).toThrow('Can only resume postponed tournaments');
      });
    });

    describe('nextRound', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.currentRound = 1;
        tournament.totalRounds = 3;
      });

      it('should advance to next round', () => {
        tournament.nextRound();
        
        expect(tournament.currentRound).toBe(2);
      });

      it('should complete tournament when reaching final round', () => {
        tournament.currentRound = 3;
        
        tournament.nextRound();
        
        expect(tournament.status).toBe(TournamentStatus.COMPLETED);
        expect(tournament.completedAt).toBeInstanceOf(Date);
      });

      it('should throw error if tournament is not active', () => {
        tournament.status = TournamentStatus.COMPLETED;
        
        expect(() => tournament.nextRound()).toThrow('Tournament is not active');
      });
    });

    describe('generateBracket', () => {
      it('should generate bracket for single elimination', () => {
        tournament.format = TournamentFormat.SINGLE_ELIMINATION;
        tournament.maxPlayers = 8;
        tournament.playersCount = 8;
        
        const bracket = tournament.generateBracket();
        
        expect(bracket).toBeDefined();
        expect(bracket.format).toBe(TournamentFormat.SINGLE_ELIMINATION);
        expect(bracket.participants).toHaveLength(8);
        expect(bracket.totalRounds).toBe(3); // 8 players = 3 rounds
        expect(bracket.matches).toBeDefined();
        expect(bracket.matches[1]).toHaveLength(4); // First round has 4 matches
      });

      it('should generate bracket for double elimination', () => {
        tournament.format = TournamentFormat.DOUBLE_ELIMINATION;
        tournament.maxPlayers = 8;
        tournament.playersCount = 8;
        
        const bracket = tournament.generateBracket();
        
        expect(bracket.format).toBe(TournamentFormat.DOUBLE_ELIMINATION);
        expect(bracket.winnersBracket).toBeDefined();
        expect(bracket.losersBracket).toBeDefined();
      });

      it('should generate bracket for round robin', () => {
        tournament.format = TournamentFormat.ROUND_ROBIN;
        tournament.maxPlayers = 6;
        tournament.playersCount = 6;
        
        const bracket = tournament.generateBracket();
        
        expect(bracket.format).toBe(TournamentFormat.ROUND_ROBIN);
        expect(bracket.rounds).toBe(5); // n-1 rounds for round robin
        expect(bracket.matchesPerRound).toBe(3); // n/2 matches per round
      });

      it('should throw error if not enough participants', () => {
        tournament.participants = [];
        tournament.playersCount = 1;
        
        expect(() => tournament.generateBracket()).toThrow('Not enough participants to generate bracket');
      });
    });

    describe('seedParticipants', () => {
      it('should seed participants based on ELO rating', () => {
        tournament.seedParticipants();
        
        // Participants should be seeded with highest ELO getting seed 1
        const sortedParticipants = tournament.participants!.sort((a, b) => a.seed! - b.seed!);
        
        expect(sortedParticipants[0].seed).toBe(1);
        expect(sortedParticipants[0].user.eloRating).toBe(1575); // Highest ELO
        expect(sortedParticipants[7].seed).toBe(8);
        expect(sortedParticipants[7].user.eloRating).toBe(1425); // Lowest ELO
      });

      it('should handle participants with same ELO', () => {
        // Set same ELO for all participants
        participants.forEach(p => p.user.eloRating = 1500);
        
        tournament.seedParticipants();
        
        // Should still assign unique seeds
        const seeds = tournament.participants!.map(p => p.seed).sort();
        expect(seeds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      });

      it('should throw error if no participants', () => {
        tournament.participants = [];
        
        expect(() => tournament.seedParticipants()).toThrow('No participants to seed');
      });
    });

    describe('addPrize', () => {
      it('should add prize to pool', () => {
        tournament.prizePool = 100;
        
        tournament.addPrize(50);
        
        expect(tournament.prizePool).toBe(150);
      });

      it('should handle zero prize addition', () => {
        tournament.prizePool = 100;
        
        tournament.addPrize(0);
        
        expect(tournament.prizePool).toBe(100);
      });
    });

    describe('setPassword', () => {
      it('should set password', () => {
        tournament.setPassword('newpassword');
        
        expect(tournament.password).toBe('newpassword');
        expect(tournament.isPublic).toBe(false);
      });

      it('should remove password when set to null', () => {
        tournament.password = 'oldpassword';
        tournament.isPublic = false;
        
        tournament.setPassword(null);
        
        expect(tournament.password).toBeNull();
        expect(tournament.isPublic).toBe(true);
      });
    });

    describe('updateSettings', () => {
      it('should update tournament settings', () => {
        const newSettings = {
          bestOf: 5,
          timeLimit: 600,
          allowSpectators: false,
          customRule: 'No trash talking',
        };
        
        tournament.updateSettings(newSettings);
        
        expect(tournament.settings).toEqual(expect.objectContaining(newSettings));
      });

      it('should merge with existing settings', () => {
        tournament.settings = {
          bestOf: 3,
          timeLimit: 300,
          allowSpectators: true,
        };
        
        tournament.updateSettings({ timeLimit: 600 });
        
        expect(tournament.settings).toEqual({
          bestOf: 3,
          timeLimit: 600,
          allowSpectators: true,
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('checkPassword', () => {
      it('should return true for correct password', () => {
        tournament.password = 'correctpassword';
        
        expect(tournament.checkPassword('correctpassword')).toBe(true);
      });

      it('should return false for incorrect password', () => {
        tournament.password = 'correctpassword';
        
        expect(tournament.checkPassword('wrongpassword')).toBe(false);
      });

      it('should return true when no password is set', () => {
        tournament.password = null;
        
        expect(tournament.checkPassword('anypassword')).toBe(true);
      });
    });

    describe('getParticipantByUserId', () => {
      beforeEach(() => {
        const participant = new TournamentParticipant();
        participant.user = users[0];
        tournament.participants = [participant];
      });

      it('should find participant by user ID', () => {
        const participant = tournament.getParticipantByUserId(users[0].id);
        
        expect(participant).toBeDefined();
        expect(participant!.user.id).toBe(users[0].id);
      });

      it('should return undefined for non-existent user', () => {
        const participant = tournament.getParticipantByUserId('non-existent-id');
        
        expect(participant).toBeUndefined();
      });

      it('should handle empty participants array', () => {
        tournament.participants = [];
        
        const participant = tournament.getParticipantByUserId(users[0].id);
        
        expect(participant).toBeUndefined();
      });
    });

    describe('getActiveMatches', () => {
      beforeEach(() => {
        const matches = [
          { status: MatchStatus.ACTIVE },
          { status: MatchStatus.COMPLETED },
          { status: MatchStatus.ACTIVE },
          { status: MatchStatus.SCHEDULED },
        ].map((data, index) => {
          const match = new TournamentMatch();
          match.id = `match-${index}`;
          match.status = data.status;
          match.tournament = tournament;
          match.round = 1;
          match.matchNumber = index + 1;
          return match;
        });
        
        tournament.matches = matches;
      });

      it('should return only active matches', () => {
        const activeMatches = tournament.getActiveMatches();
        
        expect(activeMatches).toHaveLength(2);
        activeMatches.forEach(match => {
          expect(match.status).toBe(MatchStatus.ACTIVE);
        });
      });

      it('should return empty array when no active matches', () => {
        tournament.matches!.forEach(match => {
          match.status = MatchStatus.COMPLETED;
        });
        
        const activeMatches = tournament.getActiveMatches();
        
        expect(activeMatches).toHaveLength(0);
      });

      it('should handle undefined matches', () => {
        tournament.matches = undefined;
        
        const activeMatches = tournament.getActiveMatches();
        
        expect(activeMatches).toHaveLength(0);
      });
    });

    describe('getMatchesForRound', () => {
      beforeEach(() => {
        const matches = [
          { round: 1 },
          { round: 2 },
          { round: 1 },
          { round: 3 },
        ].map((data, index) => {
          const match = new TournamentMatch();
          match.id = `match-${index}`;
          match.round = data.round;
          match.tournament = tournament;
          match.matchNumber = index + 1;
          return match;
        });
        
        tournament.matches = matches;
      });

      it('should return matches for specified round', () => {
        const round1Matches = tournament.getMatchesForRound(1);
        
        expect(round1Matches).toHaveLength(2);
        round1Matches.forEach(match => {
          expect(match.round).toBe(1);
        });
      });

      it('should return empty array for non-existent round', () => {
        const matches = tournament.getMatchesForRound(5);
        
        expect(matches).toHaveLength(0);
      });
    });

    describe('getLeaderboard', () => {
      beforeEach(() => {
        tournament.participants = participants.map((p, index) => {
          p.points = 10 - index; // Descending points
          p.matchesWon = 5 - index;
          p.gamesWon = 15 - (index * 2);
          return p;
        });
      });

      it('should return participants sorted by points', () => {
        const leaderboard = tournament.getLeaderboard();
        
        expect(leaderboard).toHaveLength(8);
        
        // Should be sorted by points descending
        for (let i = 0; i < leaderboard.length - 1; i++) {
          expect(leaderboard[i].points).toBeGreaterThanOrEqual(leaderboard[i + 1].points);
        }
      });

      it('should handle participants with same points', () => {
        // Set same points for all participants
        tournament.participants!.forEach(p => {
          p.points = 5;
          p.matchesWon = 3;
          p.gamesWon = 10;
        });
        
        const leaderboard = tournament.getLeaderboard();
        
        expect(leaderboard).toHaveLength(8);
        // Should still return all participants
        expect(leaderboard.every(p => p.points === 5)).toBe(true);
      });

      it('should handle empty participants', () => {
        tournament.participants = [];
        
        const leaderboard = tournament.getLeaderboard();
        
        expect(leaderboard).toHaveLength(0);
      });
    });

    describe('getSummary', () => {
      beforeEach(() => {
        tournament.status = TournamentStatus.ACTIVE;
        tournament.actualStartTime = new Date();
        tournament.currentRound = 2;
        tournament.playersCount = 8;
        tournament.winner = users[0];
        tournament.participants = participants;
      });

      it('should return comprehensive tournament summary', () => {
        const summary = tournament.getSummary();
        
        expect(summary).toMatchObject({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          format: tournament.format,
          status: tournament.status,
          players: {
            current: 8,
            max: 16,
            isFull: false,
          },
          rounds: {
            current: 2,
            total: 4,
            progress: 50,
          },
          organizer: {
            id: organizer.id,
            displayName: organizer.displayName,
          },
          prizes: {
            entryFee: 10,
            pool: 100,
          },
          settings: tournament.settings,
        });
        
        expect(summary.timing.registrationDeadline).toBeInstanceOf(Date);
        expect(summary.timing.startDate).toBeInstanceOf(Date);
        expect(summary.timing.endDate).toBeInstanceOf(Date);
        expect(summary.timing.actualStart).toBeInstanceOf(Date);
        expect(summary.timing.hasStarted).toBe(true);
        expect(summary.timing.canRegister).toBe(false);
      });

      it('should handle tournament without winner', () => {
        tournament.winner = undefined;
        
        const summary = tournament.getSummary();
        
        expect(summary.winner).toBeUndefined();
      });

      it('should handle tournament with no participants', () => {
        tournament.participants = [];
        tournament.playersCount = 0;
        
        const summary = tournament.getSummary();
        
        expect(summary.players.current).toBe(0);
        expect(summary.players.isFull).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle bracket generation for odd number of players', () => {
      tournament.participants = participants.slice(0, 7); // 7 players
      tournament.playersCount = 7;
      tournament.format = TournamentFormat.SINGLE_ELIMINATION;
      
      const bracket = tournament.generateBracket();
      
      expect(bracket).toBeDefined();
      expect(bracket.participants).toHaveLength(7);
      // Should handle byes automatically
    });

    it('should handle very long tournament duration', () => {
      tournament.actualStartTime = new Date(2023, 0, 1, 0, 0, 0);
      tournament.completedAt = new Date(2023, 0, 2, 5, 30, 45); // 29h 30m 45s later
      
      expect(tournament.formattedDuration).toBe('29h 30m 45s');
    });

    it('should handle metadata operations', () => {
      tournament.metadata = {
        streamUrl: 'https://twitch.tv/tournament',
        sponsors: ['Sponsor A', 'Sponsor B'],
        customData: { theme: 'dark', language: 'en' },
      };
      
      expect(tournament.metadata.streamUrl).toBe('https://twitch.tv/tournament');
      expect(tournament.metadata.sponsors).toContain('Sponsor A');
    });

    it('should handle settings updates with null values', () => {
      tournament.settings = { bestOf: 3, timeLimit: 300 };
      
      tournament.updateSettings({ bestOf: null } as any);
      
      expect(tournament.settings.bestOf).toBeNull();
      expect(tournament.settings.timeLimit).toBe(300);
    });

    it('should handle password operations with edge cases', () => {
      tournament.password = '';
      expect(tournament.checkPassword('')).toBe(true);
      
      tournament.password = '   '; // Whitespace
      expect(tournament.checkPassword('   ')).toBe(true);
    });

    it('should handle seeding with no participants', () => {
      tournament.participants = undefined;
      
      expect(() => tournament.seedParticipants()).toThrow('No participants to seed');
    });

    it('should handle bracket generation for minimum players', () => {
      tournament.participants = participants.slice(0, 2); // 2 players
      tournament.playersCount = 2;
      tournament.format = TournamentFormat.SINGLE_ELIMINATION;
      
      const bracket = tournament.generateBracket();
      
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.matches[1]).toHaveLength(1);
    });

    it('should handle zero prize pool', () => {
      tournament.prizePool = 0;
      tournament.entryFee = 0;
      
      const summary = tournament.getSummary();
      
      expect(summary.prizes.pool).toBe(0);
      expect(summary.prizes.entryFee).toBe(0);
    });

    it('should handle tournament with no settings', () => {
      tournament.settings = undefined;
      
      tournament.updateSettings({ bestOf: 5 });
      
      expect(tournament.settings).toEqual({ bestOf: 5 });
    });
  });
});