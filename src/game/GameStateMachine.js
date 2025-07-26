/**
 * Game State Machine
 * Comprehensive state management for tournaments, matches, and game flows
 */

class GameStateMachine {
    constructor() {
        this.states = new Map();
        this.transitions = new Map();
        this.eventListeners = new Map();
        this.currentStates = new Map(); // entityId -> currentState
        this.stateHistory = new Map();  // entityId -> state history
        this.initializeStateMachines();
    }

    /**
     * Initialize all state machine definitions
     */
    initializeStateMachines() {
        this.defineTournamentStateMachine();
        this.defineMatchStateMachine();
        this.defineGameRoundStateMachine();
        this.definePlayerStateMachine();
        this.defineSpectatorStateMachine();
    }

    /**
     * TOURNAMENT STATE MACHINE
     */
    defineTournamentStateMachine() {
        const tournamentStates = {
            'created': {
                description: 'Tournament created, awaiting setup',
                allowedActions: ['configure', 'cancel'],
                entryActions: ['initializeBracket', 'setupRegistration'],
                exitActions: []
            },
            'registration': {
                description: 'Player registration phase',
                allowedActions: ['register', 'unregister', 'start', 'cancel'],
                entryActions: ['openRegistration', 'notifyRegistrationOpen'],
                exitActions: ['closeRegistration'],
                timeout: 300000 // 5 minutes default
            },
            'ready': {
                description: 'Ready to start, minimum players met',
                allowedActions: ['start', 'cancel', 'configure'],
                entryActions: ['validatePlayerCount', 'generateBracket'],
                exitActions: []
            },
            'active': {
                description: 'Tournament in progress',
                allowedActions: ['pause', 'cancel', 'advance'],
                entryActions: ['startFirstRound', 'notifyStart'],
                exitActions: ['pauseAllMatches']
            },
            'paused': {
                description: 'Tournament temporarily paused',
                allowedActions: ['resume', 'cancel'],
                entryActions: ['notifyPause'],
                exitActions: []
            },
            'completed': {
                description: 'Tournament finished',
                allowedActions: ['archive'],
                entryActions: ['announceWinner', 'updateStats', 'cleanup'],
                exitActions: [],
                final: true
            },
            'cancelled': {
                description: 'Tournament cancelled',
                allowedActions: ['archive'],
                entryActions: ['notifyCancellation', 'refundPlayers', 'cleanup'],
                exitActions: [],
                final: true
            }
        };

        const tournamentTransitions = {
            'created': ['registration', 'cancelled'],
            'registration': ['ready', 'cancelled'],
            'ready': ['active', 'cancelled'],
            'active': ['paused', 'completed', 'cancelled'],
            'paused': ['active', 'cancelled'],
            'completed': [],
            'cancelled': []
        };

        this.states.set('tournament', tournamentStates);
        this.transitions.set('tournament', tournamentTransitions);
    }

    /**
     * MATCH STATE MACHINE
     */
    defineMatchStateMachine() {
        const matchStates = {
            'scheduled': {
                description: 'Match scheduled but not ready',
                allowedActions: ['cancel'],
                entryActions: ['scheduleMatch'],
                exitActions: []
            },
            'ready': {
                description: 'Both players available, can start',
                allowedActions: ['start', 'cancel'],
                entryActions: ['notifyPlayers', 'prepareMatch'],
                exitActions: []
            },
            'active': {
                description: 'Match in progress',
                allowedActions: ['pause', 'forfeit', 'complete'],
                entryActions: ['startMatch', 'startTimer'],
                exitActions: ['stopTimer']
            },
            'paused': {
                description: 'Match temporarily paused',
                allowedActions: ['resume', 'cancel'],
                entryActions: ['notifyPause'],
                exitActions: []
            },
            'completed': {
                description: 'Match finished with result',
                allowedActions: ['archive'],
                entryActions: ['recordResult', 'updateStats', 'advanceTournament'],
                exitActions: [],
                final: true
            },
            'forfeited': {
                description: 'Match ended by forfeit',
                allowedActions: ['archive'],
                entryActions: ['recordForfeit', 'advanceTournament'],
                exitActions: [],
                final: true
            },
            'cancelled': {
                description: 'Match cancelled',
                allowedActions: ['archive'],
                entryActions: ['notifyCancellation'],
                exitActions: [],
                final: true
            }
        };

        const matchTransitions = {
            'scheduled': ['ready', 'cancelled'],
            'ready': ['active', 'cancelled'],
            'active': ['paused', 'completed', 'forfeited', 'cancelled'],
            'paused': ['active', 'cancelled'],
            'completed': [],
            'forfeited': [],
            'cancelled': []
        };

        this.states.set('match', matchStates);
        this.transitions.set('match', matchTransitions);
    }

    /**
     * GAME ROUND STATE MACHINE (for best-of-3 rounds)
     */
    defineGameRoundStateMachine() {
        const roundStates = {
            'waiting': {
                description: 'Waiting for player moves',
                allowedActions: ['move', 'timeout', 'cancel'],
                entryActions: ['startRoundTimer', 'notifyPlayers'],
                exitActions: ['stopRoundTimer']
            },
            'player1_moved': {
                description: 'Player 1 has made their move',
                allowedActions: ['move', 'timeout', 'cancel'],
                entryActions: ['notifyWaitingForPlayer2'],
                exitActions: []
            },
            'player2_moved': {
                description: 'Player 2 has made their move',
                allowedActions: ['move', 'timeout', 'cancel'],
                entryActions: ['notifyWaitingForPlayer1'],
                exitActions: []
            },
            'both_moved': {
                description: 'Both players have moved',
                allowedActions: ['resolve'],
                entryActions: ['calculateResult', 'showMoves'],
                exitActions: []
            },
            'resolved': {
                description: 'Round result determined',
                allowedActions: ['next_round', 'end_match'],
                entryActions: ['announceWinner', 'updateScore'],
                exitActions: [],
                final: true
            },
            'timeout': {
                description: 'Round timed out',
                allowedActions: ['resolve'],
                entryActions: ['handleTimeout', 'determineTimeoutWinner'],
                exitActions: [],
                final: true
            }
        };

        const roundTransitions = {
            'waiting': ['player1_moved', 'player2_moved', 'timeout', 'cancelled'],
            'player1_moved': ['both_moved', 'timeout', 'cancelled'],
            'player2_moved': ['both_moved', 'timeout', 'cancelled'],
            'both_moved': ['resolved'],
            'resolved': [],
            'timeout': ['resolved']
        };

        this.states.set('round', roundStates);
        this.transitions.set('round', roundTransitions);
    }

    /**
     * PLAYER STATE MACHINE
     */
    definePlayerStateMachine() {
        const playerStates = {
            'idle': {
                description: 'Player not in any game',
                allowedActions: ['join_tournament', 'spectate'],
                entryActions: [],
                exitActions: []
            },
            'registered': {
                description: 'Registered for tournament',
                allowedActions: ['unregister', 'ready'],
                entryActions: ['confirmRegistration'],
                exitActions: []
            },
            'waiting': {
                description: 'Waiting for match to start',
                allowedActions: ['forfeit', 'spectate_other'],
                entryActions: ['notifyMatchScheduled'],
                exitActions: []
            },
            'playing': {
                description: 'Currently in a match',
                allowedActions: ['move', 'forfeit', 'pause'],
                entryActions: ['enterMatch'],
                exitActions: ['exitMatch']
            },
            'spectating': {
                description: 'Watching other matches',
                allowedActions: ['stop_spectating', 'join_tournament'],
                entryActions: ['joinSpectatorMode'],
                exitActions: ['leaveSpectatorMode']
            },
            'eliminated': {
                description: 'Eliminated from tournament',
                allowedActions: ['spectate', 'join_tournament'],
                entryActions: ['recordElimination', 'notifyElimination'],
                exitActions: []
            },
            'winner': {
                description: 'Won the tournament',
                allowedActions: ['spectate', 'join_tournament'],
                entryActions: ['recordVictory', 'announceVictory'],
                exitActions: [],
                final: true
            }
        };

        const playerTransitions = {
            'idle': ['registered', 'spectating'],
            'registered': ['waiting', 'idle'],
            'waiting': ['playing', 'eliminated', 'idle'],
            'playing': ['waiting', 'eliminated', 'winner', 'idle'],
            'spectating': ['idle', 'registered'],
            'eliminated': ['spectating', 'idle'],
            'winner': ['spectating', 'idle']
        };

        this.states.set('player', playerStates);
        this.transitions.set('player', playerTransitions);
    }

    /**
     * SPECTATOR STATE MACHINE
     */
    defineSpectatorStateMachine() {
        const spectatorStates = {
            'browsing': {
                description: 'Looking for matches to watch',
                allowedActions: ['join_match', 'leave'],
                entryActions: ['showAvailableMatches'],
                exitActions: []
            },
            'watching': {
                description: 'Actively watching a match',
                allowedActions: ['leave_match', 'switch_match', 'mute', 'unmute'],
                entryActions: ['joinMatchChat', 'enableNotifications'],
                exitActions: ['leaveMatchChat', 'disableNotifications']
            },
            'muted': {
                description: 'Watching but with notifications muted',
                allowedActions: ['unmute', 'leave_match', 'switch_match'],
                entryActions: ['disableNotifications'],
                exitActions: []
            },
            'left': {
                description: 'No longer spectating',
                allowedActions: [],
                entryActions: ['cleanup'],
                exitActions: [],
                final: true
            }
        };

        const spectatorTransitions = {
            'browsing': ['watching', 'left'],
            'watching': ['browsing', 'muted', 'left'],
            'muted': ['watching', 'browsing', 'left'],
            'left': []
        };

        this.states.set('spectator', spectatorStates);
        this.transitions.set('spectator', spectatorTransitions);
    }

    /**
     * STATE MACHINE OPERATIONS
     */

    /**
     * Initialize entity in state machine
     * @param {string} entityType - Type of entity (tournament, match, etc.)
     * @param {string} entityId - Unique entity identifier
     * @param {string} initialState - Starting state
     */
    initialize(entityType, entityId, initialState = null) {
        const stateDefinitions = this.states.get(entityType);
        if (!stateDefinitions) {
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        // Set initial state (first state if not specified)
        const startState = initialState || Object.keys(stateDefinitions)[0];
        if (!stateDefinitions[startState]) {
            throw new Error(`Invalid initial state: ${startState}`);
        }

        const entityKey = `${entityType}:${entityId}`;
        this.currentStates.set(entityKey, startState);
        this.stateHistory.set(entityKey, [{
            state: startState,
            timestamp: new Date(),
            reason: 'initialized'
        }]);

        // Execute entry actions
        this.executeStateActions(entityType, entityId, startState, 'entryActions');

        return startState;
    }

    /**
     * Transition entity to new state
     * @param {string} entityType - Type of entity
     * @param {string} entityId - Entity identifier
     * @param {string} newState - Target state
     * @param {string} reason - Reason for transition
     * @param {Object} context - Additional context data
     */
    transition(entityType, entityId, newState, reason = '', context = {}) {
        const entityKey = `${entityType}:${entityId}`;
        const currentState = this.currentStates.get(entityKey);
        
        if (!currentState) {
            throw new Error(`Entity ${entityKey} not initialized in state machine`);
        }

        // Validate transition
        if (!this.canTransition(entityType, currentState, newState)) {
            throw new Error(`Invalid transition from ${currentState} to ${newState} for ${entityType}`);
        }

        // Execute exit actions for current state
        this.executeStateActions(entityType, entityId, currentState, 'exitActions', context);

        // Update state
        this.currentStates.set(entityKey, newState);
        
        // Record in history
        const history = this.stateHistory.get(entityKey) || [];
        history.push({
            from: currentState,
            to: newState,
            timestamp: new Date(),
            reason,
            context
        });
        this.stateHistory.set(entityKey, history);

        // Execute entry actions for new state
        this.executeStateActions(entityType, entityId, newState, 'entryActions', context);

        // Emit state change event
        this.emitStateChange(entityType, entityId, currentState, newState, context);

        return newState;
    }

    /**
     * Check if transition is valid
     * @param {string} entityType - Entity type
     * @param {string} fromState - Current state
     * @param {string} toState - Target state
     * @returns {boolean} Whether transition is valid
     */
    canTransition(entityType, fromState, toState) {
        const transitions = this.transitions.get(entityType);
        if (!transitions || !transitions[fromState]) {
            return false;
        }
        return transitions[fromState].includes(toState);
    }

    /**
     * Get current state of entity
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @returns {string} Current state
     */
    getCurrentState(entityType, entityId) {
        const entityKey = `${entityType}:${entityId}`;
        return this.currentStates.get(entityKey);
    }

    /**
     * Get allowed actions for current state
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @returns {Array} Allowed actions
     */
    getAllowedActions(entityType, entityId) {
        const currentState = this.getCurrentState(entityType, entityId);
        if (!currentState) return [];

        const stateDefinitions = this.states.get(entityType);
        return stateDefinitions[currentState]?.allowedActions || [];
    }

    /**
     * Get state history for entity
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @returns {Array} State history
     */
    getHistory(entityType, entityId) {
        const entityKey = `${entityType}:${entityId}`;
        return this.stateHistory.get(entityKey) || [];
    }

    /**
     * Execute state actions
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @param {string} state - State name
     * @param {string} actionType - Action type (entryActions/exitActions)
     * @param {Object} context - Context data
     */
    executeStateActions(entityType, entityId, state, actionType, context = {}) {
        const stateDefinitions = this.states.get(entityType);
        const actions = stateDefinitions[state]?.[actionType] || [];

        actions.forEach(action => {
            this.executeAction(entityType, entityId, action, context);
        });
    }

    /**
     * Execute individual action
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @param {string} action - Action name
     * @param {Object} context - Context data
     */
    executeAction(entityType, entityId, action, context) {
        // Emit action event for external handlers
        this.emitAction(entityType, entityId, action, context);
    }

    /**
     * Add event listener for state changes
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    /**
     * Emit state change event
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {Object} context - Context data
     */
    emitStateChange(entityType, entityId, fromState, toState, context) {
        const event = 'stateChange';
        const listeners = this.eventListeners.get(event) || [];
        
        listeners.forEach(handler => {
            try {
                handler({ entityType, entityId, fromState, toState, context });
            } catch (error) {
                console.error('Error in state change handler:', error);
            }
        });
    }

    /**
     * Emit action event
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity identifier
     * @param {string} action - Action name
     * @param {Object} context - Context data
     */
    emitAction(entityType, entityId, action, context) {
        const event = 'action';
        const listeners = this.eventListeners.get(event) || [];
        
        listeners.forEach(handler => {
            try {
                handler({ entityType, entityId, action, context });
            } catch (error) {
                console.error('Error in action handler:', error);
            }
        });
    }

    /**
     * Generate state diagram for visualization
     * @param {string} entityType - Entity type
     * @returns {string} ASCII state diagram
     */
    generateStateDiagram(entityType) {
        const stateDefinitions = this.states.get(entityType);
        const transitions = this.transitions.get(entityType);
        
        if (!stateDefinitions || !transitions) {
            return `No state machine defined for ${entityType}`;
        }

        let diagram = `\n🔀 STATE MACHINE: ${entityType.toUpperCase()}\n`;
        diagram += '═'.repeat(40) + '\n\n';

        // Show states
        Object.entries(stateDefinitions).forEach(([stateName, stateInfo]) => {
            const isFinal = stateInfo.final ? ' (FINAL)' : '';
            diagram += `📍 ${stateName.toUpperCase()}${isFinal}\n`;
            diagram += `   ${stateInfo.description}\n`;
            diagram += `   Actions: ${stateInfo.allowedActions.join(', ')}\n`;
            
            // Show transitions
            const nextStates = transitions[stateName] || [];
            if (nextStates.length > 0) {
                diagram += `   → ${nextStates.join(', ')}\n`;
            }
            diagram += '\n';
        });

        return diagram;
    }
}

module.exports = GameStateMachine;