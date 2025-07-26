/**
 * Spectator Mode Implementation
 * Advanced spectating system for tournament matches with real-time updates
 */

class SpectatorMode {
    constructor() {
        this.spectatorSessions = new Map(); // spectatorId -> session data
        this.matchSpectators = new Map();   // matchId -> Set of spectators
        this.spectatorGroups = new Map();   // groupId -> Set of spectators
        this.notificationQueues = new Map(); // spectatorId -> notification queue
        this.spectatorStats = new Map();    // spectatorId -> viewing statistics
    }

    /**
     * SPECTATOR SESSION MANAGEMENT
     */

    /**
     * Join a match as spectator
     * @param {string} spectatorId - Spectator user ID
     * @param {string} matchId - Match to spectate
     * @param {Object} chatInfo - Telegram chat information
     * @param {Object} preferences - Spectator preferences
     * @returns {Object} Spectator session
     */
    joinMatch(spectatorId, matchId, chatInfo, preferences = {}) {
        const session = {
            spectatorId,
            matchId,
            chatId: chatInfo.chatId,
            joinedAt: new Date(),
            preferences: {
                realTimeUpdates: preferences.realTimeUpdates ?? true,
                showPlayerMoves: preferences.showPlayerMoves ?? true,
                showGameHistory: preferences.showGameHistory ?? true,
                enableSoundEffects: preferences.enableSoundEffects ?? false,
                commentaryLevel: preferences.commentaryLevel ?? 'normal', // minimal, normal, detailed
                ...preferences
            },
            status: 'active',
            notificationCount: 0,
            lastActivity: new Date()
        };

        // Store session
        this.spectatorSessions.set(spectatorId, session);

        // Add to match spectators
        if (!this.matchSpectators.has(matchId)) {
            this.matchSpectators.set(matchId, new Set());
        }
        this.matchSpectators.get(matchId).add(spectatorId);

        // Initialize stats
        this.initializeSpectatorStats(spectatorId);

        // Send welcome message with match overview
        this.sendMatchOverview(spectatorId, matchId);

        return session;
    }

    /**
     * Leave spectating a match
     * @param {string} spectatorId - Spectator user ID
     * @returns {boolean} Success status
     */
    leaveMatch(spectatorId) {
        const session = this.spectatorSessions.get(spectatorId);
        if (!session) return false;

        const matchId = session.matchId;

        // Remove from match spectators
        if (this.matchSpectators.has(matchId)) {
            this.matchSpectators.get(matchId).delete(spectatorId);
            if (this.matchSpectators.get(matchId).size === 0) {
                this.matchSpectators.delete(matchId);
            }
        }

        // Update stats
        this.updateSpectatorStats(spectatorId, 'sessionEnded');

        // Remove session
        this.spectatorSessions.delete(spectatorId);

        return true;
    }

    /**
     * Switch to different match
     * @param {string} spectatorId - Spectator user ID
     * @param {string} newMatchId - New match to spectate
     * @returns {Object} Updated session
     */
    switchMatch(spectatorId, newMatchId) {
        this.leaveMatch(spectatorId);
        // Note: Would need chatInfo and preferences from previous session
        const session = this.spectatorSessions.get(spectatorId);
        if (session) {
            return this.joinMatch(spectatorId, newMatchId, 
                { chatId: session.chatId }, session.preferences);
        }
        return null;
    }

    /**
     * REAL-TIME MATCH UPDATES
     */

    /**
     * Broadcast match event to all spectators
     * @param {string} matchId - Match identifier
     * @param {string} eventType - Type of event
     * @param {Object} eventData - Event data
     */
    broadcastMatchEvent(matchId, eventType, eventData) {
        const spectators = this.matchSpectators.get(matchId);
        if (!spectators || spectators.size === 0) return;

        const updates = [];
        spectators.forEach(spectatorId => {
            const session = this.spectatorSessions.get(spectatorId);
            if (!session || session.status !== 'active') return;

            // Check if spectator wants this type of update
            if (!this.shouldReceiveUpdate(session, eventType)) return;

            const formattedUpdate = this.formatSpectatorUpdate(eventType, eventData, session);
            updates.push({
                spectatorId,
                chatId: session.chatId,
                message: formattedUpdate,
                eventType
            });

            // Update statistics
            this.updateSpectatorStats(spectatorId, 'updateReceived');
            session.notificationCount++;
            session.lastActivity = new Date();
        });

        return updates;
    }

    /**
     * Format update message for spectator
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     * @param {Object} session - Spectator session
     * @returns {string} Formatted message
     */
    formatSpectatorUpdate(eventType, eventData, session) {
        const { commentaryLevel, showPlayerMoves } = session.preferences;

        switch (eventType) {
            case 'roundStart':
                return this.formatRoundStart(eventData, commentaryLevel);
            case 'playerMove':
                return showPlayerMoves ? 
                    this.formatPlayerMove(eventData, commentaryLevel) : null;
            case 'roundComplete':
                return this.formatRoundComplete(eventData, commentaryLevel);
            case 'matchComplete':
                return this.formatMatchComplete(eventData, commentaryLevel);
            case 'playerTimeout':
                return this.formatPlayerTimeout(eventData, commentaryLevel);
            case 'matchPaused':
                return this.formatMatchPaused(eventData, commentaryLevel);
            case 'matchResumed':
                return this.formatMatchResumed(eventData, commentaryLevel);
            default:
                return `🔔 ${eventType}: ${JSON.stringify(eventData)}`;
        }
    }

    /**
     * SPECTATOR UPDATE FORMATTERS
     */

    /**
     * Format round start message
     * @param {Object} eventData - Round start data
     * @param {string} commentaryLevel - Commentary level
     * @returns {string} Formatted message
     */
    formatRoundStart(eventData, commentaryLevel) {
        const { roundNumber, totalRounds, player1, player2, score } = eventData;
        
        let message = `🥊 ROUND ${roundNumber}/${totalRounds}\n`;
        message += `${player1.name} vs ${player2.name}\n`;
        message += `Score: ${score[0]} - ${score[1]}\n`;

        if (commentaryLevel === 'detailed') {
            message += `\n📊 Match Statistics:\n`;
            message += `• ${player1.name}: ${player1.winsInMatch || 0} rounds won\n`;
            message += `• ${player2.name}: ${player2.winsInMatch || 0} rounds won\n`;
            
            if (roundNumber > 1) {
                message += `• Previous round: ${eventData.previousWinner} won with ${eventData.previousPlay}\n`;
            }
        }

        return message;
    }

    /**
     * Format player move message
     * @param {Object} eventData - Move data
     * @param {string} commentaryLevel - Commentary level
     * @returns {string} Formatted message
     */
    formatPlayerMove(eventData, commentaryLevel) {
        const { playerName, moveHidden } = eventData;
        
        if (moveHidden) {
            return `✋ ${playerName} has made their move!`;
        }

        if (commentaryLevel === 'minimal') {
            return `📝 ${playerName}: ${eventData.move}`;
        }

        let message = `🎯 ${playerName} plays: ${this.getMoveEmoji(eventData.move)} ${eventData.move.toUpperCase()}`;
        
        if (commentaryLevel === 'detailed' && eventData.moveStats) {
            message += `\n📈 ${playerName}'s ${eventData.move} usage: ${eventData.moveStats.percentage}%`;
        }

        return message;
    }

    /**
     * Format round complete message
     * @param {Object} eventData - Round complete data
     * @param {string} commentaryLevel - Commentary level
     * @returns {string} Formatted message
     */
    formatRoundComplete(eventData, commentaryLevel) {
        const { winner, loser, winnerMove, loserMove, roundNumber } = eventData;
        
        let message = `🏆 Round ${roundNumber} Result:\n`;
        message += `${this.getMoveEmoji(winnerMove)} ${winner.name}: ${winnerMove.toUpperCase()}\n`;
        message += `${this.getMoveEmoji(loserMove)} ${loser.name}: ${loserMove.toUpperCase()}\n`;
        message += `\n✨ ${winner.name} wins the round!\n`;

        if (commentaryLevel === 'detailed') {
            message += `\n🎲 ${winnerMove} beats ${loserMove}\n`;
            message += `📊 Current match score: ${eventData.newScore[0]} - ${eventData.newScore[1]}`;
            
            if (eventData.matchPoint) {
                message += `\n🚨 MATCH POINT for ${winner.name}!`;
            }
        }

        return message;
    }

    /**
     * Format match complete message
     * @param {Object} eventData - Match complete data
     * @param {string} commentaryLevel - Commentary level
     * @returns {string} Formatted message
     */
    formatMatchComplete(eventData, commentaryLevel) {
        const { winner, loser, finalScore, totalRounds, duration } = eventData;
        
        let message = `🎉 MATCH COMPLETE!\n`;
        message += `═══════════════════\n`;
        message += `🏆 Winner: ${winner.name}\n`;
        message += `📊 Final Score: ${finalScore[0]} - ${finalScore[1]}\n`;
        message += `⏱️ Duration: ${this.formatDuration(duration)}\n`;

        if (commentaryLevel !== 'minimal') {
            message += `\n📈 Match Summary:\n`;
            message += `• Total rounds played: ${totalRounds}\n`;
            message += `• ${winner.name} won ${finalScore[0]} rounds\n`;
            message += `• ${loser.name} won ${finalScore[1]} rounds\n`;
        }

        if (commentaryLevel === 'detailed' && eventData.stats) {
            message += `\n📊 Detailed Stats:\n`;
            message += `• Most used move: ${eventData.stats.mostUsedMove}\n`;
            message += `• Longest round: ${eventData.stats.longestRound}s\n`;
            message += `• Average round time: ${eventData.stats.averageRoundTime}s\n`;
        }

        return message;
    }

    /**
     * SPECTATOR GROUPS AND COMMUNITIES
     */

    /**
     * Create spectator group for tournament
     * @param {string} tournamentId - Tournament identifier
     * @param {Object} groupSettings - Group settings
     * @returns {string} Group ID
     */
    createSpectatorGroup(tournamentId, groupSettings = {}) {
        const groupId = `group_${tournamentId}_${Date.now()}`;
        
        const group = {
            id: groupId,
            tournamentId,
            name: groupSettings.name || `Tournament ${tournamentId} Spectators`,
            description: groupSettings.description || 'Watch and discuss tournament matches',
            settings: {
                allowChat: groupSettings.allowChat ?? true,
                allowReactions: groupSettings.allowReactions ?? true,
                showPlayerStats: groupSettings.showPlayerStats ?? true,
                enablePolls: groupSettings.enablePolls ?? false,
                ...groupSettings
            },
            spectators: new Set(),
            createdAt: new Date(),
            messageCount: 0
        };

        this.spectatorGroups.set(groupId, group);
        return groupId;
    }

    /**
     * Join spectator group
     * @param {string} spectatorId - Spectator user ID
     * @param {string} groupId - Group identifier
     * @returns {boolean} Success status
     */
    joinSpectatorGroup(spectatorId, groupId) {
        const group = this.spectatorGroups.get(groupId);
        if (!group) return false;

        group.spectators.add(spectatorId);
        
        // Update spectator session if exists
        const session = this.spectatorSessions.get(spectatorId);
        if (session) {
            session.groupId = groupId;
        }

        return true;
    }

    /**
     * SPECTATOR STATISTICS AND ANALYTICS
     */

    /**
     * Initialize spectator statistics
     * @param {string} spectatorId - Spectator user ID
     */
    initializeSpectatorStats(spectatorId) {
        const stats = {
            totalSessions: 0,
            totalWatchTime: 0,
            matchesWatched: new Set(),
            tournamentsWatched: new Set(),
            favoriteEventTypes: new Map(),
            averageSessionDuration: 0,
            lastActive: new Date(),
            preferences: new Map()
        };

        this.spectatorStats.set(spectatorId, stats);
    }

    /**
     * Update spectator statistics
     * @param {string} spectatorId - Spectator user ID
     * @param {string} eventType - Type of event
     * @param {Object} data - Additional data
     */
    updateSpectatorStats(spectatorId, eventType, data = {}) {
        const stats = this.spectatorStats.get(spectatorId);
        if (!stats) return;

        switch (eventType) {
            case 'sessionStarted':
                stats.totalSessions++;
                stats.lastActive = new Date();
                break;
            case 'sessionEnded':
                const session = this.spectatorSessions.get(spectatorId);
                if (session) {
                    const duration = Date.now() - session.joinedAt.getTime();
                    stats.totalWatchTime += duration;
                    stats.matchesWatched.add(session.matchId);
                }
                break;
            case 'updateReceived':
                const eventType = data.eventType;
                if (eventType) {
                    const count = stats.favoriteEventTypes.get(eventType) || 0;
                    stats.favoriteEventTypes.set(eventType, count + 1);
                }
                stats.lastActive = new Date();
                break;
        }

        // Update average session duration
        if (stats.totalSessions > 0) {
            stats.averageSessionDuration = stats.totalWatchTime / stats.totalSessions;
        }
    }

    /**
     * UTILITY METHODS
     */

    /**
     * Check if spectator should receive update
     * @param {Object} session - Spectator session
     * @param {string} eventType - Event type
     * @returns {boolean} Should receive update
     */
    shouldReceiveUpdate(session, eventType) {
        const { preferences } = session;
        
        if (!preferences.realTimeUpdates) return false;
        
        switch (eventType) {
            case 'playerMove':
                return preferences.showPlayerMoves;
            case 'roundStart':
            case 'roundComplete':
            case 'matchComplete':
                return true;
            case 'playerTimeout':
            case 'matchPaused':
            case 'matchResumed':
                return preferences.commentaryLevel !== 'minimal';
            default:
                return true;
        }
    }

    /**
     * Get move emoji
     * @param {string} move - Move name
     * @returns {string} Move emoji
     */
    getMoveEmoji(move) {
        const emojis = {
            'rock': '🪨',
            'paper': '📄',
            'scissors': '✂️'
        };
        return emojis[move] || '❓';
    }

    /**
     * Format duration in human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Send match overview to new spectator
     * @param {string} spectatorId - Spectator user ID
     * @param {string} matchId - Match identifier
     */
    sendMatchOverview(spectatorId, matchId) {
        // This would be implemented to send initial match state
        // to the spectator when they join
        const overview = this.generateMatchOverview(matchId);
        return {
            spectatorId,
            message: overview,
            type: 'overview'
        };
    }

    /**
     * Generate match overview message
     * @param {string} matchId - Match identifier
     * @returns {string} Overview message
     */
    generateMatchOverview(matchId) {
        // This would fetch current match state and format it
        return `🎮 Welcome to Match ${matchId}!\n` +
               `You are now spectating this best-of-3 Rock Paper Scissors match.\n` +
               `Use /spectator_help for available commands.`;
    }

    /**
     * Get spectator count for match
     * @param {string} matchId - Match identifier
     * @returns {number} Number of spectators
     */
    getSpectatorCount(matchId) {
        const spectators = this.matchSpectators.get(matchId);
        return spectators ? spectators.size : 0;
    }

    /**
     * Get all active spectator sessions
     * @returns {Map} Active sessions
     */
    getActiveSessions() {
        return new Map(this.spectatorSessions);
    }

    /**
     * Clean up inactive sessions
     * @param {number} timeoutMinutes - Timeout in minutes
     */
    cleanupInactiveSessions(timeoutMinutes = 30) {
        const timeoutMs = timeoutMinutes * 60 * 1000;
        const now = Date.now();
        
        this.spectatorSessions.forEach((session, spectatorId) => {
            if (now - session.lastActivity.getTime() > timeoutMs) {
                this.leaveMatch(spectatorId);
            }
        });
    }
}

module.exports = SpectatorMode;