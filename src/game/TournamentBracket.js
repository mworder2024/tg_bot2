/**
 * Tournament Bracket Manager
 * Advanced bracket generation algorithms and tournament flow management
 */

class TournamentBracket {
    constructor() {
        this.brackets = new Map();
        this.bracketTemplates = new Map();
        this.initializeBracketTemplates();
    }

    /**
     * Initialize predefined bracket templates
     */
    initializeBracketTemplates() {
        // Single Elimination Templates
        this.bracketTemplates.set('single-4', {
            size: 4,
            rounds: 2,
            structure: [
                { round: 1, matches: 2 },
                { round: 2, matches: 1 }
            ]
        });

        this.bracketTemplates.set('single-8', {
            size: 8,
            rounds: 3,
            structure: [
                { round: 1, matches: 4 },
                { round: 2, matches: 2 },
                { round: 3, matches: 1 }
            ]
        });

        this.bracketTemplates.set('single-16', {
            size: 16,
            rounds: 4,
            structure: [
                { round: 1, matches: 8 },
                { round: 2, matches: 4 },
                { round: 3, matches: 2 },
                { round: 4, matches: 1 }
            ]
        });

        // Double Elimination Templates
        this.bracketTemplates.set('double-4', {
            size: 4,
            rounds: 4, // Winners: 2, Losers: 2, Grand Finals: 1
            winnersRounds: 2,
            losersRounds: 2,
            grandFinals: 1
        });
    }

    /**
     * ADVANCED BRACKET GENERATION
     */

    /**
     * Create tournament bracket with advanced seeding
     * @param {Array} players - Player array with rankings
     * @param {string} type - Tournament type
     * @param {Object} options - Bracket options
     * @returns {Object} Complete bracket structure
     */
    createAdvancedBracket(players, type = 'single-elimination', options = {}) {
        const {
            seeding = 'standard',
            balancing = true,
            regions = false
        } = options;

        // Apply seeding algorithm
        const seededPlayers = this.applySeedingAlgorithm(players, seeding);
        
        // Generate bracket structure
        const bracket = this.generateBracketStructure(seededPlayers, type);
        
        // Apply balancing if requested
        if (balancing) {
            this.applyBracketBalancing(bracket);
        }

        // Handle regional seeding if requested
        if (regions) {
            this.applyRegionalSeeding(bracket, regions);
        }

        return bracket;
    }

    /**
     * Apply seeding algorithm to players
     * @param {Array} players - Player array
     * @param {string} algorithm - Seeding algorithm type
     * @returns {Array} Seeded players
     */
    applySeedingAlgorithm(players, algorithm) {
        switch (algorithm) {
            case 'standard':
                return this.standardSeeding(players);
            case 'snake':
                return this.snakeSeeding(players);
            case 'random':
                return this.randomSeeding(players);
            case 'skill-based':
                return this.skillBasedSeeding(players);
            default:
                return players;
        }
    }

    /**
     * Standard tournament seeding (1 vs lowest, 2 vs 2nd lowest, etc.)
     * @param {Array} players - Player array
     * @returns {Array} Seeded players
     */
    standardSeeding(players) {
        const sorted = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const bracketSize = this.getNextPowerOfTwo(sorted.length);
        const seeded = new Array(bracketSize);

        // Add actual players
        for (let i = 0; i < sorted.length; i++) {
            seeded[i] = { ...sorted[i], seed: i + 1 };
        }

        // Add byes
        for (let i = sorted.length; i < bracketSize; i++) {
            seeded[i] = { id: `bye-${i}`, name: 'BYE', isBye: true, seed: i + 1 };
        }

        // Arrange in standard tournament order
        return this.arrangeStandardOrder(seeded);
    }

    /**
     * Arrange players in standard tournament order
     * @param {Array} seeded - Seeded players
     * @returns {Array} Arranged players
     */
    arrangeStandardOrder(seeded) {
        const n = seeded.length;
        const arranged = new Array(n);
        
        // Standard pairing: 1-n, 2-(n-1), 3-(n-2), etc.
        for (let i = 0; i < n / 2; i++) {
            arranged[i * 2] = seeded[i];
            arranged[i * 2 + 1] = seeded[n - 1 - i];
        }
        
        return arranged;
    }

    /**
     * BRACKET VISUALIZATION AND ASCII GENERATION
     */

    /**
     * Generate comprehensive bracket ASCII with enhanced formatting
     * @param {Object} bracket - Tournament bracket
     * @param {Object} options - Formatting options
     * @returns {string} Formatted ASCII bracket
     */
    generateEnhancedBracketASCII(bracket, options = {}) {
        const {
            showSeeds = true,
            showScores = true,
            showStatus = true,
            compact = false
        } = options;

        let ascii = this.generateBracketHeader(bracket);
        
        switch (bracket.type) {
            case 'single-elimination':
                ascii += this.generateSingleEliminationEnhanced(bracket, options);
                break;
            case 'double-elimination':
                ascii += this.generateDoubleEliminationEnhanced(bracket, options);
                break;
            default:
                ascii += 'Unsupported bracket type\n';
        }

        ascii += this.generateBracketFooter(bracket);
        return ascii;
    }

    /**
     * Generate bracket header with tournament info
     * @param {Object} bracket - Tournament bracket
     * @returns {string} Header ASCII
     */
    generateBracketHeader(bracket) {
        const title = `🏆 ${bracket.name || 'TOURNAMENT'} - ${bracket.type.toUpperCase()}`;
        const border = '═'.repeat(title.length);
        
        let header = `${border}\n`;
        header += `${title}\n`;
        header += `${border}\n`;
        header += `📊 Players: ${bracket.players.length} | `;
        header += `🎯 Status: ${this.getStatusIcon(bracket.status)} ${bracket.status}\n`;
        header += `⏰ Started: ${bracket.createdAt ? bracket.createdAt.toLocaleString() : 'Not started'}\n`;
        header += `${border}\n\n`;
        
        return header;
    }

    /**
     * Generate enhanced single elimination bracket
     * @param {Object} bracket - Tournament bracket
     * @param {Object} options - Formatting options
     * @returns {string} Enhanced ASCII
     */
    generateSingleEliminationEnhanced(bracket, options) {
        let ascii = '';
        const { showSeeds, showScores, compact } = options;
        
        for (let round = 1; round <= bracket.rounds; round++) {
            const roundName = this.getRoundName(round, bracket.rounds);
            ascii += `\n${roundName}\n`;
            ascii += '─'.repeat(roundName.length) + '\n';
            
            const matches = this.getMatchesForRound(bracket, round);
            matches.forEach((match, index) => {
                ascii += this.formatMatchASCII(match, { showSeeds, showScores, compact });
                
                if (index < matches.length - 1 && !compact) {
                    ascii += '\n';
                }
            });
            
            ascii += '\n';
        }
        
        return ascii;
    }

    /**
     * Format individual match for ASCII display
     * @param {Object} match - Match object
     * @param {Object} options - Formatting options
     * @returns {string} Formatted match ASCII
     */
    formatMatchASCII(match, options = {}) {
        const { showSeeds, showScores, compact } = options;
        const player1 = match.players[0];
        const player2 = match.players[1];
        const boxWidth = compact ? 25 : 35;
        
        let ascii = '';
        
        // Top border
        ascii += '┌' + '─'.repeat(boxWidth - 2) + '┐\n';
        
        // Player 1
        let p1Line = `│ ${this.formatPlayerName(player1, showSeeds, boxWidth - 4)}`;
        if (match.winner === player1.id) p1Line += ' ✓';
        if (showScores && match.score && match.status === 'completed') {
            p1Line += ` (${match.score[0]})`;
        }
        p1Line = this.padLine(p1Line, boxWidth - 1) + '│\n';
        ascii += p1Line;
        
        // VS line
        ascii += `│${' '.repeat(Math.floor((boxWidth - 6) / 2))}VS${' '.repeat(Math.ceil((boxWidth - 6) / 2))}│\n`;
        
        // Player 2
        let p2Line = `│ ${this.formatPlayerName(player2, showSeeds, boxWidth - 4)}`;
        if (match.winner === player2.id) p2Line += ' ✓';
        if (showScores && match.score && match.status === 'completed') {
            p2Line += ` (${match.score[1]})`;
        }
        p2Line = this.padLine(p2Line, boxWidth - 1) + '│\n';
        ascii += p2Line;
        
        // Bottom border with status
        ascii += '└' + '─'.repeat(boxWidth - 2) + '┘';
        
        // Status indicator
        if (match.status) {
            ascii += ` [${this.getMatchStatusIcon(match.status)}]`;
        }
        
        ascii += '\n';
        
        return ascii;
    }

    /**
     * BRACKET PROGRESSION AND MATCH MANAGEMENT
     */

    /**
     * Progress bracket based on match results
     * @param {string} bracketId - Bracket identifier
     * @param {string} matchId - Completed match identifier
     * @param {string} winnerId - Winner player ID
     */
    progressBracket(bracketId, matchId, winnerId) {
        const bracket = this.brackets.get(bracketId);
        if (!bracket) {
            throw new Error('Bracket not found');
        }

        const match = this.findMatch(bracket, matchId);
        if (!match) {
            throw new Error('Match not found in bracket');
        }

        // Set match winner
        match.winner = winnerId;
        match.status = 'completed';
        match.completedAt = new Date();

        // Progress winner to next round
        this.advanceWinnerInBracket(bracket, match);

        // Handle loser in double elimination
        if (bracket.type === 'double-elimination') {
            this.handleLoserInDoubleElimination(bracket, match);
        }

        // Check if tournament is complete
        this.checkTournamentCompletion(bracket);
    }

    /**
     * Advance winner to next round in bracket
     * @param {Object} bracket - Tournament bracket
     * @param {Object} completedMatch - Completed match
     */
    advanceWinnerInBracket(bracket, completedMatch) {
        const nextRound = completedMatch.round + 1;
        
        if (nextRound > bracket.rounds) {
            // Tournament complete
            bracket.winner = completedMatch.winner;
            bracket.status = 'completed';
            bracket.completedAt = new Date();
            return;
        }

        // Find next match position
        const nextMatchIndex = Math.floor(completedMatch.bracketPosition / 2);
        const nextMatch = this.findOrCreateNextMatch(bracket, nextRound, nextMatchIndex);
        
        // Add winner to next match
        const winner = bracket.players.find(p => p.id === completedMatch.winner);
        if (nextMatch.players.length === 0) {
            nextMatch.players[0] = winner;
        } else {
            nextMatch.players[1] = winner;
            // Both players assigned, match can start
            nextMatch.status = 'ready';
        }
    }

    /**
     * UTILITY METHODS FOR BRACKET MANAGEMENT
     */

    /**
     * Get round name based on position
     * @param {number} round - Round number
     * @param {number} totalRounds - Total rounds in tournament
     * @returns {string} Round name
     */
    getRoundName(round, totalRounds) {
        if (round === totalRounds) return '🏆 FINALS';
        if (round === totalRounds - 1) return '🥉 SEMIFINALS';
        if (round === totalRounds - 2) return '🎯 QUARTERFINALS';
        return `📋 ROUND ${round}`;
    }

    /**
     * Get status icon for display
     * @param {string} status - Status string
     * @returns {string} Status icon
     */
    getStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'active': '🔥',
            'completed': '✅',
            'cancelled': '❌',
            'paused': '⏸️'
        };
        return icons[status] || '❓';
    }

    /**
     * Get match status icon
     * @param {string} status - Match status
     * @returns {string} Status icon
     */
    getMatchStatusIcon(status) {
        const icons = {
            'waiting': '⏳',
            'ready': '🟢',
            'active': '🔥',
            'completed': '✅',
            'cancelled': '❌'
        };
        return icons[status] || '❓';
    }

    /**
     * Format player name with seed if requested
     * @param {Object} player - Player object
     * @param {boolean} showSeeds - Whether to show seeds
     * @param {number} maxLength - Maximum name length
     * @returns {string} Formatted name
     */
    formatPlayerName(player, showSeeds, maxLength) {
        let name = player.name;
        
        if (showSeeds && player.seed && !player.isBye) {
            name = `(${player.seed}) ${name}`;
        }
        
        if (name.length > maxLength) {
            name = name.substring(0, maxLength - 3) + '...';
        }
        
        return name;
    }

    /**
     * Pad line to specific length
     * @param {string} line - Line to pad
     * @param {number} length - Target length
     * @returns {string} Padded line
     */
    padLine(line, length) {
        if (line.length >= length) return line;
        return line + ' '.repeat(length - line.length);
    }

    /**
     * Get next power of two
     * @param {number} n - Input number
     * @returns {number} Next power of two
     */
    getNextPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }
}

module.exports = TournamentBracket;