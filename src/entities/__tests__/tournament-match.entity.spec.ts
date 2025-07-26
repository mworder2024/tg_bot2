import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { TournamentMatch, MatchStatus } from '../tournament-match.entity';
import { User } from '../user.entity';
import { Tournament, TournamentStatus, TournamentFormat } from '../tournament.entity';
import { Game } from '../game.entity';

describe('TournamentMatch Entity', () => {
  let module: TestingModule;
  let match: TournamentMatch;
  let user1: User;
  let user2: User;
  let tournament: Tournament;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [],
    }).compile();

    // Create test users
    user1 = new User();
    user1.id = 'user1-id';
    user1.telegramId = 12345;
    user1.username = 'player1';
    user1.firstName = 'John';
    user1.lastName = 'Doe';
    user1.eloRating = 1500;

    user2 = new User();
    user2.id = 'user2-id';
    user2.telegramId = 67890;
    user2.username = 'player2';
    user2.firstName = 'Jane';
    user2.lastName = 'Smith';
    user2.eloRating = 1400;

    // Create test tournament
    tournament = new Tournament();
    tournament.id = 'tournament-id';
    tournament.name = 'Test Tournament';
    tournament.format = TournamentFormat.SINGLE_ELIMINATION;
    tournament.status = TournamentStatus.ACTIVE;
    tournament.maxPlayers = 8;
    tournament.organizerId = 'organizer-id';

    // Create test match
    match = new TournamentMatch();
    match.id = 'match-id';
    match.tournament = tournament;
    match.player1 = user1;
    match.player2 = user2;
    match.round = 1;
    match.matchNumber = 1;
    match.bestOf = 3;
    match.status = MatchStatus.SCHEDULED;
    match.player1Score = 0;
    match.player2Score = 0;
    match.gamesPlayed = 0;
    match.gamesDrawn = 0;
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Entity Validation', () => {
    it('should validate a valid tournament match', async () => {
      const errors = await validate(match);
      expect(errors).toHaveLength(0);
    });

    it('should require tournament', async () => {
      match.tournament = null as any;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require player1', async () => {
      match.player1 = null as any;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require player2', async () => {
      match.player2 = null as any;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require positive round number', async () => {
      match.round = 0;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require positive match number', async () => {
      match.matchNumber = 0;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate bestOf is within valid range', async () => {
      match.bestOf = 0;
      let errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);

      match.bestOf = 12;
      errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);

      match.bestOf = 5;
      errors = await validate(match);
      expect(errors).toHaveLength(0);
    });

    it('should validate scores are non-negative', async () => {
      match.player1Score = -1;
      let errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);

      match.player1Score = 0;
      match.player2Score = -1;
      errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate status is valid enum value', async () => {
      match.status = 'INVALID_STATUS' as any;
      const errors = await validate(match);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate scheduledTime is a valid date when provided', async () => {
      match.scheduledTime = new Date();
      const errors = await validate(match);
      expect(errors).toHaveLength(0);
    });

    it('should validate deadline is a valid date when provided', async () => {
      match.deadline = new Date(Date.now() + 86400000); // Tomorrow
      const errors = await validate(match);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    describe('isCompleted', () => {
      it('should return true when status is COMPLETED', () => {
        match.status = MatchStatus.COMPLETED;
        expect(match.isCompleted).toBe(true);
      });

      it('should return false when status is not COMPLETED', () => {
        match.status = MatchStatus.ACTIVE;
        expect(match.isCompleted).toBe(false);
      });
    });

    describe('isActive', () => {
      it('should return true when status is ACTIVE', () => {
        match.status = MatchStatus.ACTIVE;
        expect(match.isActive).toBe(true);
      });

      it('should return false when status is not ACTIVE', () => {
        match.status = MatchStatus.COMPLETED;
        expect(match.isActive).toBe(false);
      });
    });

    describe('gamesToWin', () => {
      it('should calculate games needed to win correctly', () => {
        match.bestOf = 1;
        expect(match.gamesToWin).toBe(1);

        match.bestOf = 3;
        expect(match.gamesToWin).toBe(2);

        match.bestOf = 5;
        expect(match.gamesToWin).toBe(3);

        match.bestOf = 7;
        expect(match.gamesToWin).toBe(4);
      });
    });

    describe('isDecided', () => {
      it('should return true when player1 has enough wins', () => {
        match.bestOf = 3;
        match.player1Score = 2;
        match.player2Score = 0;
        expect(match.isDecided).toBe(true);
      });

      it('should return true when player2 has enough wins', () => {
        match.bestOf = 3;
        match.player1Score = 0;
        match.player2Score = 2;
        expect(match.isDecided).toBe(true);
      });

      it('should return false when neither player has enough wins', () => {
        match.bestOf = 3;
        match.player1Score = 1;
        match.player2Score = 1;
        expect(match.isDecided).toBe(false);
      });
    });

    describe('leadingPlayer', () => {
      it('should return player1 when they are leading', () => {
        match.player1Score = 2;
        match.player2Score = 1;
        expect(match.leadingPlayer).toBe(user1);
      });

      it('should return player2 when they are leading', () => {
        match.player1Score = 1;
        match.player2Score = 2;
        expect(match.leadingPlayer).toBe(user2);
      });

      it('should return null when scores are tied', () => {
        match.player1Score = 1;
        match.player2Score = 1;
        expect(match.leadingPlayer).toBe(null);
      });
    });

    describe('scoreString', () => {
      it('should return formatted score string', () => {
        match.player1Score = 2;
        match.player2Score = 1;
        expect(match.scoreString).toBe('2-1');
      });
    });

    describe('isOverdue', () => {
      it('should return true when deadline has passed', () => {
        match.deadline = new Date(Date.now() - 3600000); // 1 hour ago
        expect(match.isOverdue).toBe(true);
      });

      it('should return false when deadline has not passed', () => {
        match.deadline = new Date(Date.now() + 3600000); // 1 hour from now
        expect(match.isOverdue).toBe(false);
      });

      it('should return false when no deadline is set', () => {
        match.deadline = undefined;
        expect(match.isOverdue).toBe(false);
      });
    });

    describe('formattedDuration', () => {
      it('should return N/A when no duration is set', () => {
        match.durationSeconds = undefined;
        expect(match.formattedDuration).toBe('N/A');
      });

      it('should format seconds only', () => {
        match.durationSeconds = 45;
        expect(match.formattedDuration).toBe('45s');
      });

      it('should format minutes and seconds', () => {
        match.durationSeconds = 125; // 2m 5s
        expect(match.formattedDuration).toBe('2m 5s');
      });

      it('should format hours, minutes, and seconds', () => {
        match.durationSeconds = 3665; // 1h 1m 5s
        expect(match.formattedDuration).toBe('1h 1m 5s');
      });
    });
  });

  describe('Match Management Methods', () => {
    describe('start', () => {
      it('should start a scheduled match', () => {
        match.status = MatchStatus.SCHEDULED;
        const beforeStart = new Date();
        
        match.start();
        
        expect(match.status).toBe(MatchStatus.ACTIVE);
        expect(match.startedAt).toBeInstanceOf(Date);
        expect(match.startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      });

      it('should throw error if match is not scheduled', () => {
        match.status = MatchStatus.ACTIVE;
        
        expect(() => match.start()).toThrow('Match is not scheduled');
      });
    });

    describe('recordGameResult', () => {
      beforeEach(() => {
        match.status = MatchStatus.ACTIVE;
        match.bestOf = 3;
      });

      it('should record player1 win', () => {
        match.recordGameResult(user1.id);
        
        expect(match.player1Score).toBe(1);
        expect(match.player2Score).toBe(0);
        expect(match.gamesPlayed).toBe(1);
        expect(match.status).toBe(MatchStatus.ACTIVE);
      });

      it('should record player2 win', () => {
        match.recordGameResult(user2.id);
        
        expect(match.player1Score).toBe(0);
        expect(match.player2Score).toBe(1);
        expect(match.gamesPlayed).toBe(1);
        expect(match.status).toBe(MatchStatus.ACTIVE);
      });

      it('should record draw', () => {
        match.recordGameResult(null);
        
        expect(match.player1Score).toBe(0);
        expect(match.player2Score).toBe(0);
        expect(match.gamesPlayed).toBe(1);
        expect(match.gamesDrawn).toBe(1);
      });

      it('should complete match when player1 wins enough games', () => {
        match.recordGameResult(user1.id);
        match.recordGameResult(user1.id);
        
        expect(match.status).toBe(MatchStatus.COMPLETED);
        expect(match.winner).toBe(user1);
        expect(match.loser).toBe(user2);
        expect(match.completedAt).toBeInstanceOf(Date);
      });

      it('should complete match when player2 wins enough games', () => {
        match.recordGameResult(user2.id);
        match.recordGameResult(user2.id);
        
        expect(match.status).toBe(MatchStatus.COMPLETED);
        expect(match.winner).toBe(user2);
        expect(match.loser).toBe(user1);
        expect(match.completedAt).toBeInstanceOf(Date);
      });

      it('should throw error if match is not active', () => {
        match.status = MatchStatus.SCHEDULED;
        
        expect(() => match.recordGameResult(user1.id)).toThrow('Match is not active');
      });

      it('should throw error if match is already decided', () => {
        match.player1Score = 2; // Already won
        
        expect(() => match.recordGameResult(user1.id)).toThrow('Match is already decided');
      });

      it('should calculate duration when match completes', () => {
        match.startedAt = new Date(Date.now() - 60000); // Started 1 minute ago
        
        match.recordGameResult(user1.id);
        match.recordGameResult(user1.id);
        
        expect(match.durationSeconds).toBeGreaterThan(50);
        expect(match.durationSeconds).toBeLessThan(70);
      });
    });

    describe('awardWalkover', () => {
      it('should award walkover to player1', () => {
        match.awardWalkover(user1.id, 'Player 2 no show');
        
        expect(match.status).toBe(MatchStatus.WALKOVER);
        expect(match.winner).toBe(user1);
        expect(match.loser).toBe(user2);
        expect(match.player1Score).toBe(match.gamesToWin);
        expect(match.notes).toBe('Walkover: Player 2 no show');
        expect(match.completedAt).toBeInstanceOf(Date);
      });

      it('should award walkover to player2', () => {
        match.awardWalkover(user2.id, 'Player 1 disqualified');
        
        expect(match.status).toBe(MatchStatus.WALKOVER);
        expect(match.winner).toBe(user2);
        expect(match.loser).toBe(user1);
        expect(match.player2Score).toBe(match.gamesToWin);
        expect(match.notes).toBe('Walkover: Player 1 disqualified');
      });

      it('should throw error for invalid winner ID', () => {
        expect(() => match.awardWalkover('invalid-id')).toThrow('Invalid winner player ID');
      });

      it('should throw error if match is already completed', () => {
        match.status = MatchStatus.COMPLETED;
        
        expect(() => match.awardWalkover(user1.id)).toThrow('Match is already completed');
      });
    });

    describe('disqualifyPlayer', () => {
      it('should disqualify player1 and award win to player2', () => {
        match.disqualifyPlayer(user1.id, 'Unsportsmanlike conduct');
        
        expect(match.status).toBe(MatchStatus.DISQUALIFIED);
        expect(match.winner).toBe(user2);
        expect(match.loser).toBe(user1);
        expect(match.player2Score).toBe(match.gamesToWin);
        expect(match.notes).toBe('Disqualification: Unsportsmanlike conduct');
        expect(match.completedAt).toBeInstanceOf(Date);
      });

      it('should disqualify player2 and award win to player1', () => {
        match.disqualifyPlayer(user2.id, 'Cheating');
        
        expect(match.status).toBe(MatchStatus.DISQUALIFIED);
        expect(match.winner).toBe(user1);
        expect(match.loser).toBe(user2);
        expect(match.player1Score).toBe(match.gamesToWin);
        expect(match.notes).toBe('Disqualification: Cheating');
      });

      it('should throw error for invalid player ID', () => {
        expect(() => match.disqualifyPlayer('invalid-id', 'Reason')).toThrow('Invalid player ID for disqualification');
      });

      it('should throw error if match is already completed', () => {
        match.status = MatchStatus.COMPLETED;
        
        expect(() => match.disqualifyPlayer(user1.id, 'Reason')).toThrow('Match is already completed');
      });
    });

    describe('cancel', () => {
      it('should cancel match with reason', () => {
        match.cancel('Weather conditions');
        
        expect(match.status).toBe(MatchStatus.CANCELLED);
        expect(match.notes).toBe('Cancelled: Weather conditions');
      });

      it('should cancel match without reason', () => {
        match.cancel();
        
        expect(match.status).toBe(MatchStatus.CANCELLED);
        expect(match.notes).toBeUndefined();
      });
    });

    describe('postpone', () => {
      it('should postpone match with new scheduled time and reason', () => {
        const newTime = new Date(Date.now() + 86400000); // Tomorrow
        
        match.postpone(newTime, 'Technical difficulties');
        
        expect(match.status).toBe(MatchStatus.POSTPONED);
        expect(match.scheduledTime).toBe(newTime);
        expect(match.notes).toBe('Postponed: Technical difficulties');
      });

      it('should postpone match without new time', () => {
        match.postpone(undefined, 'Weather delay');
        
        expect(match.status).toBe(MatchStatus.POSTPONED);
        expect(match.notes).toBe('Postponed: Weather delay');
      });
    });

    describe('resume', () => {
      it('should resume postponed match to scheduled state', () => {
        match.status = MatchStatus.POSTPONED;
        match.startedAt = undefined;
        
        match.resume();
        
        expect(match.status).toBe(MatchStatus.SCHEDULED);
      });

      it('should resume postponed match to active state if already started', () => {
        match.status = MatchStatus.POSTPONED;
        match.startedAt = new Date();
        
        match.resume();
        
        expect(match.status).toBe(MatchStatus.ACTIVE);
      });

      it('should throw error if match is not postponed', () => {
        match.status = MatchStatus.ACTIVE;
        
        expect(() => match.resume()).toThrow('Can only resume postponed matches');
      });
    });
  });

  describe('Spectator Management', () => {
    describe('addSpectator', () => {
      it('should add spectator to match', () => {
        match.addSpectator('spectator-1');
        
        expect(match.metadata?.spectators).toContain('spectator-1');
      });

      it('should not add duplicate spectator', () => {
        match.addSpectator('spectator-1');
        match.addSpectator('spectator-1');
        
        expect(match.metadata?.spectators?.length).toBe(1);
      });

      it('should initialize metadata if not exists', () => {
        match.metadata = undefined;
        match.addSpectator('spectator-1');
        
        expect(match.metadata).toBeDefined();
        expect(match.metadata?.spectators).toContain('spectator-1');
      });
    });

    describe('removeSpectator', () => {
      it('should remove spectator from match', () => {
        match.addSpectator('spectator-1');
        match.addSpectator('spectator-2');
        
        match.removeSpectator('spectator-1');
        
        expect(match.metadata?.spectators).not.toContain('spectator-1');
        expect(match.metadata?.spectators).toContain('spectator-2');
      });

      it('should handle removal when no spectators exist', () => {
        expect(() => match.removeSpectator('spectator-1')).not.toThrow();
      });
    });
  });

  describe('Protest System', () => {
    describe('fileProtest', () => {
      it('should file a protest', () => {
        const beforeProtest = new Date();
        
        match.fileProtest(user1.id, 'Opponent was using illegal assistance');
        
        expect(match.metadata?.protests).toHaveLength(1);
        expect(match.metadata?.protests?.[0]).toMatchObject({
          playerId: user1.id,
          reason: 'Opponent was using illegal assistance',
          resolved: false,
        });
        expect(match.metadata?.protests?.[0].timestamp).toBeInstanceOf(Date);
        expect(match.metadata?.protests?.[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeProtest.getTime());
      });

      it('should initialize metadata if not exists', () => {
        match.metadata = undefined;
        
        match.fileProtest(user1.id, 'Test protest');
        
        expect(match.metadata).toBeDefined();
        expect(match.metadata?.protests).toHaveLength(1);
      });
    });

    describe('resolveProtest', () => {
      beforeEach(() => {
        match.fileProtest(user1.id, 'Test protest');
      });

      it('should resolve a protest with resolution', () => {
        match.resolveProtest(0, 'Protest dismissed - no evidence');
        
        expect(match.metadata?.protests?.[0].resolved).toBe(true);
        expect(match.notes).toBe('Protest resolved: Protest dismissed - no evidence');
      });

      it('should resolve a protest without resolution text', () => {
        match.resolveProtest(0);
        
        expect(match.metadata?.protests?.[0].resolved).toBe(true);
      });

      it('should handle invalid protest index', () => {
        expect(() => match.resolveProtest(99)).not.toThrow();
      });
    });
  });

  describe('Game Statistics', () => {
    describe('updateGameStats', () => {
      it('should update longest game time', () => {
        match.updateGameStats(120);
        expect(match.longestGameSeconds).toBe(120);
        
        match.updateGameStats(150);
        expect(match.longestGameSeconds).toBe(150);
        
        match.updateGameStats(100);
        expect(match.longestGameSeconds).toBe(150);
      });

      it('should update shortest game time', () => {
        match.updateGameStats(120);
        expect(match.shortestGameSeconds).toBe(120);
        
        match.updateGameStats(90);
        expect(match.shortestGameSeconds).toBe(90);
        
        match.updateGameStats(150);
        expect(match.shortestGameSeconds).toBe(90);
      });
    });
  });

  describe('Player State Methods', () => {
    describe('getMatchStateForPlayer', () => {
      beforeEach(() => {
        match.status = MatchStatus.ACTIVE;
        match.player1Score = 1;
        match.player2Score = 0;
        match.scheduledTime = new Date();
        match.startedAt = new Date();
        match.deadline = new Date(Date.now() + 3600000);
      });

      it('should return correct state for player1', () => {
        const state = match.getMatchStateForPlayer(user1.id);
        
        expect(state).toMatchObject({
          id: match.id,
          opponent: {
            id: user2.id,
            displayName: user2.displayName,
          },
          score: {
            mine: 1,
            opponent: 0,
            bestOf: 3,
            toWin: 2,
          },
          status: MatchStatus.ACTIVE,
          canPlay: true,
        });
        expect(state.timing.scheduled).toBeInstanceOf(Date);
        expect(state.timing.started).toBeInstanceOf(Date);
        expect(state.timing.deadline).toBeInstanceOf(Date);
        expect(state.timing.isOverdue).toBe(false);
      });

      it('should return correct state for player2', () => {
        const state = match.getMatchStateForPlayer(user2.id);
        
        expect(state.score).toMatchObject({
          mine: 0,
          opponent: 1,
          bestOf: 3,
          toWin: 2,
        });
        expect(state.opponent.id).toBe(user1.id);
      });

      it('should throw error for non-participant', () => {
        expect(() => match.getMatchStateForPlayer('invalid-id')).toThrow('Player is not part of this match');
      });

      it('should set canPlay to false when match is decided', () => {
        match.player1Score = 2; // Match decided
        
        const state = match.getMatchStateForPlayer(user1.id);
        expect(state.canPlay).toBe(false);
      });
    });

    describe('getSummary', () => {
      beforeEach(() => {
        match.winner = user1;
        match.scheduledTime = new Date();
        match.startedAt = new Date();
        match.completedAt = new Date();
        match.durationSeconds = 300;
        match.gamesPlayed = 3;
        match.gamesDrawn = 1;
        match.longestGameSeconds = 150;
        match.shortestGameSeconds = 45;
      });

      it('should return comprehensive match summary', () => {
        const summary = match.getSummary();
        
        expect(summary).toMatchObject({
          id: match.id,
          tournament: {
            id: tournament.id,
            name: tournament.name,
          },
          round: 1,
          matchNumber: 1,
          players: {
            player1: {
              id: user1.id,
              displayName: user1.displayName,
              score: match.player1Score,
            },
            player2: {
              id: user2.id,
              displayName: user2.displayName,
              score: match.player2Score,
            },
          },
          format: {
            bestOf: 3,
            gamesToWin: 2,
          },
          status: match.status,
          winner: {
            id: user1.id,
            displayName: user1.displayName,
          },
          statistics: {
            gamesPlayed: 3,
            gamesDrawn: 1,
            longestGame: 150,
            shortestGame: 45,
          },
        });
        
        expect(summary.timing.scheduled).toBeInstanceOf(Date);
        expect(summary.timing.started).toBeInstanceOf(Date);
        expect(summary.timing.completed).toBeInstanceOf(Date);
        expect(summary.timing.duration).toBe('5m 0s');
        expect(summary.timing.isOverdue).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle match with no winner (draw scenario)', () => {
      match.status = MatchStatus.COMPLETED;
      match.winner = undefined;
      match.loser = undefined;
      
      const summary = match.getSummary();
      expect(summary.winner).toBeUndefined();
    });

    it('should handle metadata operations with null metadata', () => {
      match.metadata = null as any;
      
      expect(() => match.addSpectator('test')).not.toThrow();
      expect(() => match.removeSpectator('test')).not.toThrow();
      expect(() => match.fileProtest('player', 'reason')).not.toThrow();
    });

    it('should handle duration calculation with missing start time', () => {
      match.startedAt = undefined;
      match.completedAt = new Date();
      
      // This would be called internally by completeMatch
      const originalCompleteMatch = match['completeMatch'].bind(match);
      originalCompleteMatch();
      
      expect(match.durationSeconds).toBeUndefined();
    });

    it('should handle best-of-1 matches correctly', () => {
      match.bestOf = 1;
      match.status = MatchStatus.ACTIVE;
      
      expect(match.gamesToWin).toBe(1);
      
      match.recordGameResult(user1.id);
      
      expect(match.status).toBe(MatchStatus.COMPLETED);
      expect(match.winner).toBe(user1);
    });

    it('should handle very long match durations', () => {
      match.durationSeconds = 7265; // 2h 1m 5s
      expect(match.formattedDuration).toBe('2h 1m 5s');
    });

    it('should handle protest resolution with existing notes', () => {
      match.notes = 'Existing notes';
      match.fileProtest(user1.id, 'Test');
      
      match.resolveProtest(0, 'Resolution');
      
      // Should not overwrite existing notes if they exist
      expect(match.notes).toBe('Existing notes');
    });
  });
});