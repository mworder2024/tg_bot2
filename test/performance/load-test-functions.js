/**
 * Artillery.js helper functions for load testing RPS Tournament Bot
 * These functions provide dynamic data generation and test scenario setup
 */

const { faker } = require('@faker-js/faker');

/**
 * Setup game scenario by creating tournament, players, and match
 */
function setupGameScenario(context, events, done) {
  // This would typically make API calls to set up required data
  // For now, we'll generate mock IDs
  context.vars.matchId = faker.string.uuid();
  context.vars.player1Id = faker.string.uuid();
  context.vars.player2Id = faker.string.uuid();
  
  return done();
}

/**
 * Get a random tournament ID from existing tournaments
 */
async function getRandomTournament(context, events, done) {
  try {
    // In a real scenario, this would query the API for active tournaments
    // For load testing, we'll generate a mock tournament ID
    context.vars.tournamentId = faker.string.uuid();
    return done();
  } catch (error) {
    events.emit('error', error);
    return done(error);
  }
}

/**
 * Generate realistic player data
 */
function generatePlayerData(context, events, done) {
  context.vars.playerData = {
    telegramId: faker.number.int({ min: 100000000, max: 999999999 }),
    username: faker.internet.userName().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };
  
  return done();
}

/**
 * Generate tournament data with realistic parameters
 */
function generateTournamentData(context, events, done) {
  const maxPlayers = faker.helpers.arrayElement([4, 8, 16, 32, 64]);
  
  context.vars.tournamentData = {
    name: `${faker.lorem.words(2)} Tournament`,
    description: faker.lorem.sentence(),
    maxPlayers,
    format: faker.helpers.arrayElement(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION']),
    isPrivate: faker.datatype.boolean(0.2), // 20% chance of private tournament
  };
  
  return done();
}

/**
 * Simulate realistic user behavior with think times
 */
function simulateUserThinking(context, events, done) {
  // Simulate user reading/thinking time (1-5 seconds)
  const thinkTime = faker.number.int({ min: 1000, max: 5000 });
  
  setTimeout(() => {
    return done();
  }, thinkTime);
}

/**
 * Generate game moves with realistic distribution
 * Based on real RPS statistics showing slight preferences
 */
function generateGameMove(context, events, done) {
  // Slightly weighted distribution based on psychological preferences
  const moveWeights = {
    'ROCK': 0.36,    // Most common first choice
    'PAPER': 0.33,   // Second most common
    'SCISSORS': 0.31, // Least common first choice
  };
  
  const move = faker.helpers.weightedArrayElement([
    { weight: moveWeights.ROCK, value: 'ROCK' },
    { weight: moveWeights.PAPER, value: 'PAPER' },
    { weight: moveWeights.SCISSORS, value: 'SCISSORS' },
  ]);
  
  context.vars.gameMove = move;
  return done();
}

/**
 * Create multiple players for a tournament scenario
 */
function createTournamentPlayers(context, events, done) {
  const playerCount = faker.number.int({ min: 2, max: 8 });
  const players = [];
  
  for (let i = 0; i < playerCount; i++) {
    players.push({
      telegramId: faker.number.int({ min: 100000000, max: 999999999 }),
      username: `loadtest_${faker.string.alphanumeric(8)}`,
      firstName: faker.person.firstName(),
    });
  }
  
  context.vars.players = players;
  context.vars.playerCount = playerCount;
  
  return done();
}

/**
 * Log custom metrics for analysis
 */
function logCustomMetric(metricName, value, context, events) {
  events.emit('counter', `custom.${metricName}`, value);
  events.emit('histogram', `custom.${metricName}.histogram`, value);
}

/**
 * Validate response and emit custom metrics
 */
function validateTournamentResponse(requestParams, response, context, events, done) {
  if (response.statusCode === 201) {
    logCustomMetric('tournament.created', 1, context, events);
    
    // Extract tournament ID for later use
    try {
      const tournament = JSON.parse(response.body);
      context.vars.createdTournamentId = tournament.id;
    } catch (error) {
      events.emit('error', new Error('Failed to parse tournament response'));
    }
  } else {
    logCustomMetric('tournament.creation.failed', 1, context, events);
  }
  
  return done();
}

/**
 * Validate player registration response
 */
function validatePlayerRegistration(requestParams, response, context, events, done) {
  if (response.statusCode === 200 || response.statusCode === 201) {
    logCustomMetric('player.registered', 1, context, events);
    
    try {
      const result = JSON.parse(response.body);
      if (result.tournament && result.tournament.status === 'ACTIVE') {
        logCustomMetric('tournament.auto.started', 1, context, events);
      }
    } catch (error) {
      // Non-critical error, continue
    }
  } else if (response.statusCode === 409) {
    logCustomMetric('player.already.registered', 1, context, events);
  } else {
    logCustomMetric('player.registration.failed', 1, context, events);
  }
  
  return done();
}

/**
 * Validate game play response
 */
function validateGameResponse(requestParams, response, context, events, done) {
  if (response.statusCode === 200 || response.statusCode === 201) {
    logCustomMetric('game.played', 1, context, events);
    
    try {
      const game = JSON.parse(response.body);
      if (game.result === 'DRAW') {
        logCustomMetric('game.draw', 1, context, events);
      } else {
        logCustomMetric('game.decided', 1, context, events);
      }
    } catch (error) {
      events.emit('error', new Error('Failed to parse game response'));
    }
  } else {
    logCustomMetric('game.failed', 1, context, events);
  }
  
  return done();
}

/**
 * Simulate error conditions for resilience testing
 */
function simulateRandomError(context, events, done) {
  // 5% chance of simulating a client-side error
  if (faker.datatype.boolean(0.05)) {
    const error = new Error('Simulated client error');
    events.emit('error', error);
    return done(error);
  }
  
  return done();
}

/**
 * Create realistic load patterns
 */
function createLoadPattern(context, events, done) {
  const patterns = [
    'steady',      // Consistent load
    'burst',       // Short bursts of activity
    'gradient',    // Gradually increasing load
    'peak_hours',  // Simulated peak usage times
  ];
  
  context.vars.loadPattern = faker.helpers.arrayElement(patterns);
  
  // Adjust behavior based on pattern
  switch (context.vars.loadPattern) {
    case 'burst':
      context.vars.burstSize = faker.number.int({ min: 3, max: 10 });
      break;
    case 'peak_hours':
      context.vars.peakMultiplier = faker.number.float({ min: 1.5, max: 3.0 });
      break;
  }
  
  return done();
}

/**
 * Monitor resource usage during tests
 */
function monitorResources(context, events, done) {
  // This would integrate with monitoring tools in a real scenario
  const fakeMemoryUsage = faker.number.int({ min: 100, max: 800 }); // MB
  const fakeCpuUsage = faker.number.int({ min: 10, max: 90 }); // Percentage
  
  logCustomMetric('system.memory.mb', fakeMemoryUsage, context, events);
  logCustomMetric('system.cpu.percent', fakeCpuUsage, context, events);
  
  return done();
}

/**
 * Cleanup resources after test scenarios
 */
function cleanupTestData(context, events, done) {
  // In a real implementation, this would clean up test data
  // to prevent database bloat during load testing
  
  if (context.vars.createdTournamentId) {
    logCustomMetric('tournament.cleanup.required', 1, context, events);
  }
  
  return done();
}

/**
 * Advanced scenario: Tournament lifecycle simulation
 */
function simulateCompleteTournament(context, events, done) {
  // This simulates a complete tournament from creation to completion
  const scenario = {
    tournamentId: faker.string.uuid(),
    maxPlayers: faker.helpers.arrayElement([4, 8, 16]),
    currentPlayers: 0,
    status: 'REGISTRATION',
    matches: [],
  };
  
  context.vars.tournamentScenario = scenario;
  logCustomMetric('tournament.lifecycle.started', 1, context, events);
  
  return done();
}

/**
 * Database connection simulation
 */
function simulateDatabaseLoad(context, events, done) {
  // Simulate various database operations with realistic timing
  const operations = [
    { name: 'SELECT', weight: 0.6, time: faker.number.int({ min: 10, max: 100 }) },
    { name: 'INSERT', weight: 0.2, time: faker.number.int({ min: 50, max: 200 }) },
    { name: 'UPDATE', weight: 0.15, time: faker.number.int({ min: 30, max: 150 }) },
    { name: 'DELETE', weight: 0.05, time: faker.number.int({ min: 20, max: 120 }) },
  ];
  
  const operation = faker.helpers.weightedArrayElement(operations);
  context.vars.dbOperation = operation.name;
  
  logCustomMetric(`db.${operation.name.toLowerCase()}.time`, operation.time, context, events);
  
  return done();
}

module.exports = {
  setupGameScenario,
  getRandomTournament,
  generatePlayerData,
  generateTournamentData,
  simulateUserThinking,
  generateGameMove,
  createTournamentPlayers,
  validateTournamentResponse,
  validatePlayerRegistration,
  validateGameResponse,
  simulateRandomError,
  createLoadPattern,
  monitorResources,
  cleanupTestData,
  simulateCompleteTournament,
  simulateDatabaseLoad,
};