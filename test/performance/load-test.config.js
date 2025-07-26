const { defineConfig } = require('artillery');

/**
 * Artillery.js Load Testing Configuration for RPS Tournament Bot
 * 
 * Usage:
 * - npm run test:load:basic - Basic load test
 * - npm run test:load:stress - Stress test with high load
 * - npm run test:load:spike - Spike test with sudden load increases
 */

const baseConfig = {
  config: {
    target: process.env.TEST_TARGET || 'http://localhost:3000',
    plugins: {
      'artillery-plugin-metrics-by-endpoint': {
        useOnlyRequestNames: true,
        stripQueryString: true,
      },
      'artillery-plugin-slack': {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#bot-testing',
        username: 'Artillery Load Test',
        reportTrigger: 'onError',
      },
    },
    processor: './test/performance/load-test-functions.js',
    variables: {
      tournament_name: 'Load Test Tournament {{ $randomString() }}',
      max_players: 8,
    },
    environments: {
      development: {
        target: 'http://localhost:3000',
        phases: [
          { duration: 30, arrivalRate: 5 },
          { duration: 60, arrivalRate: 10 },
          { duration: 30, arrivalRate: 15 },
        ],
      },
      staging: {
        target: 'https://staging-rps-bot.example.com',
        phases: [
          { duration: 60, arrivalRate: 10 },
          { duration: 120, arrivalRate: 25 },
          { duration: 60, arrivalRate: 50 },
        ],
      },
      production: {
        target: 'https://rps-bot.example.com',
        phases: [
          { duration: 120, arrivalRate: 20 },
          { duration: 300, arrivalRate: 50 },
          { duration: 120, arrivalRate: 100 },
        ],
      },
    },
    defaults: {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Artillery Load Test',
      },
    },
  },
};

// Basic Load Test Configuration
const basicLoadTest = {
  ...baseConfig,
  config: {
    ...baseConfig.config,
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Warm up' },
      { duration: 120, arrivalRate: 20, name: 'Ramp up load' },
      { duration: 180, arrivalRate: 30, name: 'Sustained load' },
      { duration: 60, arrivalRate: 10, name: 'Cool down' },
    ],
  },
  scenarios: [
    {
      name: 'Tournament Operations',
      weight: 40,
      flow: [
        {
          post: {
            url: '/tournaments',
            json: {
              name: '{{ tournament_name }}',
              maxPlayers: '{{ max_players }}',
              description: 'Artillery load test tournament',
            },
            capture: {
              json: '$.id',
              as: 'tournamentId',
            },
          },
        },
        { think: 2 },
        {
          get: {
            url: '/tournaments/{{ tournamentId }}',
          },
        },
        { think: 1 },
        {
          post: {
            url: '/tournaments/{{ tournamentId }}/players',
            json: {
              telegramId: '{{ $randomInt(100000, 999999) }}',
              username: 'loadtest_{{ $randomString() }}',
              firstName: 'Load Test User',
            },
          },
        },
      ],
    },
    {
      name: 'Player Operations',
      weight: 30,
      flow: [
        {
          post: {
            url: '/players',
            json: {
              telegramId: '{{ $randomInt(100000, 999999) }}',
              username: 'player_{{ $randomString() }}',
              firstName: 'Test Player',
            },
            capture: {
              json: '$.id',
              as: 'playerId',
            },
          },
        },
        { think: 1 },
        {
          get: {
            url: '/players/{{ playerId }}',
          },
        },
        {
          get: {
            url: '/players/{{ playerId }}/stats',
          },
        },
      ],
    },
    {
      name: 'Game Operations',
      weight: 20,
      flow: [
        // This would require existing tournament and match setup
        {
          function: 'setupGameScenario',
        },
        {
          post: {
            url: '/games',
            json: {
              matchId: '{{ matchId }}',
              player1Id: '{{ player1Id }}',
              player2Id: '{{ player2Id }}',
              player1Move: '{{ $pick("ROCK", "PAPER", "SCISSORS") }}',
              player2Move: '{{ $pick("ROCK", "PAPER", "SCISSORS") }}',
            },
          },
        },
      ],
    },
    {
      name: 'Statistics and Reporting',
      weight: 10,
      flow: [
        {
          get: {
            url: '/tournaments/active',
          },
        },
        {
          get: {
            url: '/stats/global',
          },
        },
        {
          get: {
            url: '/leaderboard?limit=10',
          },
        },
      ],
    },
  ],
};

// Stress Test Configuration
const stressTest = {
  ...baseConfig,
  config: {
    ...baseConfig.config,
    phases: [
      { duration: 60, arrivalRate: 50, name: 'Initial load' },
      { duration: 120, arrivalRate: 100, name: 'Increase load' },
      { duration: 180, arrivalRate: 200, name: 'High stress' },
      { duration: 300, arrivalRate: 500, name: 'Maximum stress' },
      { duration: 60, arrivalRate: 50, name: 'Recovery' },
    ],
    http: {
      timeout: 30000, // 30 seconds timeout for stress test
    },
  },
  scenarios: basicLoadTest.scenarios,
};

// Spike Test Configuration
const spikeTest = {
  ...baseConfig,
  config: {
    ...baseConfig.config,
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Normal load' },
      { duration: 10, arrivalRate: 500, name: 'Spike!' },
      { duration: 60, arrivalRate: 10, name: 'Recovery' },
      { duration: 10, arrivalRate: 1000, name: 'Bigger spike!' },
      { duration: 120, arrivalRate: 10, name: 'Final recovery' },
    ],
  },
  scenarios: [
    {
      name: 'Spike Test - Tournament Creation',
      weight: 60,
      flow: [
        {
          post: {
            url: '/tournaments',
            json: {
              name: 'Spike Test {{ $randomString() }}',
              maxPlayers: 8,
            },
          },
        },
      ],
    },
    {
      name: 'Spike Test - Player Registration',
      weight: 40,
      flow: [
        {
          function: 'getRandomTournament',
        },
        {
          post: {
            url: '/tournaments/{{ tournamentId }}/players',
            json: {
              telegramId: '{{ $randomInt(100000, 999999) }}',
              username: 'spike_{{ $randomString() }}',
            },
          },
        },
      ],
    },
  ],
};

// WebSocket Load Test Configuration
const websocketTest = {
  config: {
    target: process.env.WS_TARGET || 'ws://localhost:3000',
    phases: [
      { duration: 120, arrivalRate: 20 },
      { duration: 300, arrivalRate: 50 },
    ],
    ws: {
      connect: {
        subprotocols: ['telegram-bot'],
      },
    },
  },
  scenarios: [
    {
      name: 'WebSocket Tournament Updates',
      weight: 100,
      engine: 'ws',
      flow: [
        {
          send: {
            payload: JSON.stringify({
              type: 'subscribe',
              channel: 'tournament-updates',
            }),
          },
        },
        {
          think: 5,
        },
        {
          send: {
            payload: JSON.stringify({
              type: 'join-tournament',
              tournamentId: '{{ $randomUUID() }}',
              playerId: '{{ $randomUUID() }}',
            }),
          },
        },
        {
          think: 10,
        },
        {
          send: {
            payload: JSON.stringify({
              type: 'game-move',
              matchId: '{{ $randomUUID() }}',
              move: '{{ $pick("ROCK", "PAPER", "SCISSORS") }}',
            }),
          },
        },
      ],
    },
  ],
};

// Database Performance Test
const databaseTest = {
  ...baseConfig,
  config: {
    ...baseConfig.config,
    phases: [
      { duration: 180, arrivalRate: 30, name: 'Database stress' },
    ],
  },
  scenarios: [
    {
      name: 'Heavy Database Operations',
      weight: 100,
      flow: [
        // Create tournament with many players
        {
          post: {
            url: '/tournaments',
            json: {
              name: 'DB Test {{ $randomString() }}',
              maxPlayers: 64,
            },
            capture: {
              json: '$.id',
              as: 'tournamentId',
            },
          },
        },
        // Rapid player registrations
        {
          loop: [
            {
              post: {
                url: '/tournaments/{{ tournamentId }}/players',
                json: {
                  telegramId: '{{ $randomInt(100000, 999999) }}',
                  username: 'dbtest_{{ $randomString() }}',
                },
              },
            },
          ],
          count: 10,
        },
        // Complex queries
        {
          get: {
            url: '/tournaments/{{ tournamentId }}/stats?detailed=true',
          },
        },
        {
          get: {
            url: '/players/search?query={{ $randomString() }}&limit=50',
          },
        },
      ],
    },
  ],
};

// Export configurations based on test type
module.exports = {
  basic: basicLoadTest,
  stress: stressTest,
  spike: spikeTest,
  websocket: websocketTest,
  database: databaseTest,
};

// Export specific config based on environment variable
const testType = process.env.LOAD_TEST_TYPE || 'basic';
module.exports = module.exports[testType] || module.exports.basic;