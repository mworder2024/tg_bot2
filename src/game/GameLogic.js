/**
 * Core Game Logic for Telegram RPS Tournament Bot
 * Handles all tournament mechanics, bracket generation, and game flow
 */

class GameLogic {
    constructor() {
        this.tournaments = new Map(); // Active tournaments
        this.games = new Map();       // Individual games
        this.players = new Map();     // Player profiles
        this.spectators = new Map();  // Spectator sessions
    }

    /**
     * TOURNAMENT BRACKET GENERATION ALGORITHMS
     */
    
    /**
     * Generate single-elimination bracket
     * @param {Array} players - Array of player objects
     * @param {string} tournamentId - Unique tournament identifier
     * @returns {Object} Tournament bracket structure
     */
    generateSingleEliminationBracket(players, tournamentId) {
        const playerCount = players.length;
        const bracketSize = this.getNextPowerOfTwo(playerCount);
        const bracket = {
            id: tournamentId,
            type: 'single-elimination',
            size: bracketSize,
            rounds: Math.log2(bracketSize),
            players: [...players],
            matches: [],
            currentRound: 1,
            status: 'pending'
        };

        // Add byes for players if needed
        while (bracket.players.length < bracketSize) {
            bracket.players.push({ id: 'bye', name: 'BYE', isBye: true });
        }

        // Shuffle players for fair distribution
        this.shuffleArray(bracket.players);

        // Generate first round matches
        this.generateRoundMatches(bracket, 1);

        return bracket;
    }

    /**
     * Generate double-elimination bracket
     * @param {Array} players - Array of player objects
     * @param {string} tournamentId - Unique tournament identifier
     * @returns {Object} Tournament bracket structure
     */
    generateDoubleEliminationBracket(players, tournamentId) {
        const bracket = {
            id: tournamentId,
            type: 'double-elimination',
            players: [...players],
            winnersbracket: [],
            losersbracket: [],
            grandFinals: null,
            currentRound: 1,
            status: 'pending'
        };

        // Initialize winners bracket (same as single elimination)
        const winnersMatches = this.generateSingleEliminationMatches(players);
        bracket.winnersbracket = winnersMatches;

        // Losers bracket will be populated as players are eliminated
        bracket.losersbracket = [];

        return bracket;
    }

    /**
     * BEST-OF-3 GAME MECHANICS
     */

    /**
     * Create a new best-of-3 match
     * @param {Object} player1 - First player
     * @param {Object} player2 - Second player
     * @param {string} tournamentId - Tournament identifier
     * @param {number} round - Tournament round
     * @returns {Object} Match object
     */
    createBestOfThreeMatch(player1, player2, tournamentId, round) {
        const matchId = this.generateMatchId();
        const match = {
            id: matchId,
            tournamentId,
            round,
            players: [player1, player2],
            games: [],
            score: [0, 0], // [player1 wins, player2 wins]
            status: 'waiting', // waiting, active, completed
            winner: null,
            bestOf: 3,
            createdAt: new Date(),
            spectators: new Set()
        };

        this.games.set(matchId, match);
        return match;
    }

    /**
     * Play a single round in a best-of-3 match
     * @param {string} matchId - Match identifier
     * @param {string} playerId - Player making the move
     * @param {string} move - 'rock', 'paper', or 'scissors'
     * @returns {Object} Game round result
     */
    playRound(matchId, playerId, move) {
        const match = this.games.get(matchId);
        if (!match || match.status === 'completed') {
            throw new Error('Invalid match or match already completed');
        }

        const currentGame = this.getCurrentGame(match);
        if (!currentGame) {
            // Start new game round
            this.startNewGameRound(match);
        }

        return this.processMoveInCurrentGame(match, playerId, move);
    }

    /**
     * PLAYER MATCHING AND PROGRESSION LOGIC
     */

    /**
     * Advance winner to next round
     * @param {string} tournamentId - Tournament identifier
     * @param {string} matchId - Completed match identifier
     */
    advanceWinner(tournamentId, matchId) {
        const tournament = this.tournaments.get(tournamentId);
        const match = this.games.get(matchId);

        if (!tournament || !match || !match.winner) {
            throw new Error('Invalid tournament, match, or no winner determined');
        }

        const nextRound = match.round + 1;
        const maxRounds = tournament.rounds;

        if (nextRound > maxRounds) {
            // Tournament complete
            this.completeTournament(tournamentId, match.winner);
            return;
        }

        // Find or create next round match
        this.placePlayerInNextRound(tournament, match.winner, nextRound);

        // Handle loser in double elimination
        if (tournament.type === 'double-elimination') {
            this.moveLoserToLosersbracket(tournament, match);
        }
    }

    /**
     * SPECTATOR MODE IMPLEMENTATION
     */

    /**
     * Add spectator to a match
     * @param {string} matchId - Match identifier
     * @param {string} spectatorId - Spectator user ID
     * @param {Object} chatInfo - Telegram chat information
     */
    addSpectator(matchId, spectatorId, chatInfo) {
        const match = this.games.get(matchId);
        if (!match) {
            throw new Error('Match not found');
        }

        const spectatorInfo = {
            id: spectatorId,
            chatId: chatInfo.chatId,
            joinedAt: new Date(),
            notifications: true
        };

        match.spectators.add(spectatorInfo);
        
        // Store spectator session
        this.spectators.set(`${matchId}_${spectatorId}`, spectatorInfo);

        return spectatorInfo;
    }

    /**
     * Broadcast match update to spectators
     * @param {string} matchId - Match identifier
     * @param {Object} update - Update information
     */
    broadcastToSpectators(matchId, update) {
        const match = this.games.get(matchId);
        if (!match) return;

        const spectatorUpdates = [];
        match.spectators.forEach(spectator => {
            if (spectator.notifications) {
                spectatorUpdates.push({
                    chatId: spectator.chatId,
                    message: this.formatSpectatorUpdate(update, match)
                });
            }
        });

        return spectatorUpdates;
    }

    /**
     * ASCII DIAGRAM GENERATION FOR BRACKETS
     */

    /**
     * Generate ASCII bracket visualization
     * @param {Object} tournament - Tournament object
     * @returns {string} ASCII bracket diagram
     */
    generateBracketASCII(tournament) {
        switch (tournament.type) {
            case 'single-elimination':
                return this.generateSingleEliminationASCII(tournament);
            case 'double-elimination':
                return this.generateDoubleEliminationASCII(tournament);
            default:
                return 'Unsupported tournament type';
        }
    }

    /**
     * Generate single elimination ASCII bracket
     * @param {Object} tournament - Tournament object
     * @returns {string} ASCII diagram
     */
    generateSingleEliminationASCII(tournament) {
        const rounds = tournament.rounds;
        let ascii = `🏆 TOURNAMENT BRACKET - ${tournament.id.toUpperCase()}\n`;
        ascii += `═══════════════════════════════════════════\n\n`;

        // Generate bracket structure
        for (let round = 1; round <= rounds; round++) {
            ascii += `Round ${round}${round === rounds ? ' (Finals)' : ''}\n`;
            ascii += this.generateRoundASCII(tournament, round);
            ascii += '\n';
        }

        return ascii;
    }

    /**
     * Generate round ASCII representation
     * @param {Object} tournament - Tournament object
     * @param {number} round - Round number
     * @returns {string} Round ASCII
     */
    generateRoundASCII(tournament, round) {
        const matches = this.getMatchesForRound(tournament, round);
        let ascii = '';

        matches.forEach((match, index) => {
            const player1 = match.players[0];
            const player2 = match.players[1];
            const winner = match.winner;

            ascii += `┌─────────────────────┐\n`;
            ascii += `│ ${this.padName(player1.name, 19)} │`;
            if (winner === player1.id) ascii += ' ✓';
            ascii += '\n';
            ascii += `│       VS            │\n`;
            ascii += `│ ${this.padName(player2.name, 19)} │`;
            if (winner === player2.id) ascii += ' ✓';
            ascii += '\n';
            ascii += `└─────────────────────┘\n`;

            if (index < matches.length - 1) {
                ascii += '           │\n';
                ascii += '           ▼\n';
            }
        });

        return ascii;
    }

    /**
     * GAME STATE MANAGEMENT PATTERNS
     */

    /**
     * Tournament state machine
     */
    getTournamentStateMachine() {
        return {
            states: {
                'created': {
                    transitions: ['registering', 'cancelled']
                },
                'registering': {
                    transitions: ['ready', 'cancelled']
                },
                'ready': {
                    transitions: ['active', 'cancelled']
                },
                'active': {
                    transitions: ['completed', 'paused', 'cancelled']
                },
                'paused': {
                    transitions: ['active', 'cancelled']
                },
                'completed': {
                    transitions: []
                },
                'cancelled': {
                    transitions: []
                }
            }
        };
    }

    /**
     * Match state machine
     */
    getMatchStateMachine() {
        return {
            states: {
                'waiting': {
                    transitions: ['active', 'cancelled']
                },
                'active': {
                    transitions: ['completed', 'paused']
                },
                'paused': {
                    transitions: ['active', 'cancelled']
                },
                'completed': {
                    transitions: []
                },
                'cancelled': {
                    transitions: []
                }
            }
        };
    }

    /**
     * UTILITY METHODS
     */

    /**
     * Get next power of two for bracket sizing
     * @param {number} n - Number of players
     * @returns {number} Next power of two
     */
    getNextPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Generate unique match ID
     * @returns {string} Unique match identifier
     */
    generateMatchId() {
        return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Pad name for ASCII display
     * @param {string} name - Player name
     * @param {number} length - Target length
     * @returns {string} Padded name
     */
    padName(name, length) {
        if (name.length > length) {
            return name.substring(0, length - 3) + '...';
        }
        return name.padEnd(length);
    }
}

module.exports = GameLogic;