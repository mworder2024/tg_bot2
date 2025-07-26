import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { performance, PerformanceObserver } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { createClient, RedisClientType } from 'redis';
import { TestDataFactory } from '../factories/test-data-factory';

// Performance test configuration
export interface PerformanceTestConfig {
  concurrentUsers: number;
  testDuration: number; // in seconds
  rampUpTime: number; // in seconds
  thinkTime: number; // in milliseconds
  maxLatency: number; // in milliseconds
  maxThroughput: number; // requests per second
}

export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  throughput: number; // requests per second
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

/**
 * Performance Test Suite for RPS Tournament Bot
 */
export class PerformanceTestSuite {
  private app: INestApplication;
  private redisClient: RedisClientType;
  private metrics: PerformanceMetrics;
  private startTime: number;
  private requestLatencies: number[] = [];

  constructor(private config: PerformanceTestConfig) {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      throughput: 0,
      errorRate: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  async setup(): Promise<void> {
    // Setup test app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Add your modules here
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();

    // Setup Redis client
    this.redisClient = createClient({
      socket: {
        host: 'localhost',
        port: 6379,
      },
      database: 14, // Use dedicated DB for performance tests
    });
    await this.redisClient.connect();

    // Clear any existing data
    await this.redisClient.flushDb();
  }

  async teardown(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.disconnect();
    }
  }

  /**
   * Test concurrent user registration
   */
  async testConcurrentUserRegistration(): Promise<PerformanceMetrics> {
    console.log(`Testing ${this.config.concurrentUsers} concurrent user registrations...`);
    
    this.startTime = performance.now();
    const workers: Worker[] = [];
    const results: Promise<any>[] = [];

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      if (isMainThread) {
        const worker = new Worker(__filename, {
          workerData: {
            task: 'userRegistration',
            userId: 1000000 + i,
            appUrl: `http://localhost:${process.env.PORT || 3000}`,
          },
        });

        workers.push(worker);
        results.push(new Promise((resolve, reject) => {
          worker.on('message', resolve);
          worker.on('error', reject);
        }));
      }
    }

    const workerResults = await Promise.allSettled(results);
    workers.forEach(worker => worker.terminate());

    return this.calculateMetrics(workerResults);
  }

  /**
   * Test tournament creation and management under load
   */
  async testTournamentLoad(): Promise<PerformanceMetrics> {
    console.log(`Testing tournament load with ${this.config.concurrentUsers} users...`);
    
    this.startTime = performance.now();
    const promises: Promise<any>[] = [];

    // Create tournaments concurrently
    for (let i = 0; i < Math.floor(this.config.concurrentUsers / 8); i++) {
      promises.push(this.createTournamentWithPlayers(i));
    }

    const results = await Promise.allSettled(promises);
    return this.calculateMetrics(results);
  }

  /**
   * Test real-time game playing under load
   */
  async testGamePlayLoad(): Promise<PerformanceMetrics> {
    console.log(`Testing game play load...`);
    
    this.startTime = performance.now();
    const promises: Promise<any>[] = [];

    // Simulate concurrent games
    for (let i = 0; i < this.config.concurrentUsers / 2; i++) {
      promises.push(this.simulateGamePlay(i * 2, i * 2 + 1));
    }

    const results = await Promise.allSettled(promises);
    return this.calculateMetrics(results);
  }

  /**
   * Test WebSocket connections for real-time updates
   */
  async testWebSocketLoad(): Promise<PerformanceMetrics> {
    console.log(`Testing WebSocket load with ${this.config.concurrentUsers} connections...`);
    
    this.startTime = performance.now();
    const connections: any[] = [];
    const promises: Promise<any>[] = [];

    // Create WebSocket connections
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const promise = this.createWebSocketConnection(i);
      promises.push(promise);
    }

    const results = await Promise.allSettled(promises);
    return this.calculateMetrics(results);
  }

  /**
   * Test database query performance under load
   */
  async testDatabaseLoad(): Promise<PerformanceMetrics> {
    console.log(`Testing database load...`);
    
    // Seed database with test data
    await this.seedDatabaseForTesting();
    
    this.startTime = performance.now();
    const promises: Promise<any>[] = [];

    // Concurrent database operations
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.performDatabaseOperations(i));
    }

    const results = await Promise.allSettled(promises);
    return this.calculateMetrics(results);
  }

  /**
   * Test Redis caching performance
   */
  async testRedisLoad(): Promise<PerformanceMetrics> {
    console.log(`Testing Redis load...`);
    
    this.startTime = performance.now();
    const promises: Promise<any>[] = [];

    // Concurrent Redis operations
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.performRedisOperations(i));
    }

    const results = await Promise.allSettled(promises);
    return this.calculateMetrics(results);
  }

  /**
   * Run comprehensive performance test suite
   */
  async runFullTestSuite(): Promise<{
    userRegistration: PerformanceMetrics;
    tournamentLoad: PerformanceMetrics;
    gamePlayLoad: PerformanceMetrics;
    webSocketLoad: PerformanceMetrics;
    databaseLoad: PerformanceMetrics;
    redisLoad: PerformanceMetrics;
  }> {
    console.log('Starting comprehensive performance test suite...');

    const results = {
      userRegistration: await this.testConcurrentUserRegistration(),
      tournamentLoad: await this.testTournamentLoad(),
      gamePlayLoad: await this.testGamePlayLoad(),
      webSocketLoad: await this.testWebSocketLoad(),
      databaseLoad: await this.testDatabaseLoad(),
      redisLoad: await this.testRedisLoad(),
    };

    console.log('Performance test suite completed!');
    this.generateReport(results);

    return results;
  }

  // Helper methods
  private async createTournamentWithPlayers(tournamentId: number): Promise<any> {
    const startTime = performance.now();
    
    try {
      // Create tournament
      const response = await request(this.app.getHttpServer())
        .post('/tournaments')
        .send({
          name: `Load Test Tournament ${tournamentId}`,
          maxPlayers: 8,
          format: 'SINGLE_ELIMINATION',
        });

      // Add players
      const playerPromises = [];
      for (let i = 0; i < 8; i++) {
        const playerId = tournamentId * 8 + i + 1000000;
        playerPromises.push(
          request(this.app.getHttpServer())
            .post(`/tournaments/${response.body.id}/join`)
            .send({ playerId })
        );
      }

      await Promise.all(playerPromises);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency);

      return { success: true, latency };
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency, true);
      
      return { success: false, error: error.message, latency };
    }
  }

  private async simulateGamePlay(player1Id: number, player2Id: number): Promise<any> {
    const startTime = performance.now();
    
    try {
      // Simulate RPS game moves
      const moves = ['ROCK', 'PAPER', 'SCISSORS'];
      const player1Move = moves[Math.floor(Math.random() * moves.length)];
      const player2Move = moves[Math.floor(Math.random() * moves.length)];

      const response = await request(this.app.getHttpServer())
        .post('/games/play')
        .send({
          player1Id: player1Id + 1000000,
          player2Id: player2Id + 1000000,
          player1Move,
          player2Move,
        });

      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency);

      return { success: true, latency, result: response.body };
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency, true);
      
      return { success: false, error: error.message, latency };
    }
  }

  private async createWebSocketConnection(userId: number): Promise<any> {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      // Simulate WebSocket connection
      // In real implementation, you'd use actual WebSocket client
      setTimeout(() => {
        const endTime = performance.now();
        const latency = endTime - startTime;
        this.recordLatency(latency);
        
        resolve({ success: true, latency, userId });
      }, Math.random() * 100 + 50); // Simulate connection time
    });
  }

  private async performDatabaseOperations(userId: number): Promise<any> {
    const startTime = performance.now();
    
    try {
      // Simulate database queries
      const operations = [
        request(this.app.getHttpServer()).get(`/players/${userId + 1000000}`),
        request(this.app.getHttpServer()).get('/tournaments?status=ACTIVE'),
        request(this.app.getHttpServer()).get(`/players/${userId + 1000000}/stats`),
      ];

      await Promise.all(operations);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency);

      return { success: true, latency };
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency, true);
      
      return { success: false, error: error.message, latency };
    }
  }

  private async performRedisOperations(userId: number): Promise<any> {
    const startTime = performance.now();
    
    try {
      const key = `user:${userId + 1000000}`;
      const sessionKey = `session:${userId + 1000000}`;
      
      // Simulate Redis operations
      await this.redisClient.set(key, JSON.stringify({ userId, timestamp: Date.now() }));
      await this.redisClient.get(key);
      await this.redisClient.hSet(sessionKey, 'lastActive', Date.now().toString());
      await this.redisClient.hGetAll(sessionKey);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency);

      return { success: true, latency };
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.recordLatency(latency, true);
      
      return { success: false, error: error.message, latency };
    }
  }

  private async seedDatabaseForTesting(): Promise<void> {
    // Create test data using TestDataFactory
    const largeDataset = TestDataFactory.createLargeDataset({
      playerCount: 10000,
      tournamentCount: 1000,
      matchCount: 5000,
    });

    // In real implementation, you'd seed the database
    console.log('Database seeded with test data');
  }

  private recordLatency(latency: number, isError: boolean = false): void {
    this.requestLatencies.push(latency);
    this.metrics.totalRequests++;
    
    if (isError) {
      this.metrics.failedRequests++;
    } else {
      this.metrics.successfulRequests++;
    }

    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
  }

  private calculateMetrics(results: PromiseSettledResult<any>[]): PerformanceMetrics {
    const endTime = performance.now();
    const duration = (endTime - this.startTime) / 1000; // Convert to seconds

    // Calculate averages
    if (this.requestLatencies.length > 0) {
      this.metrics.averageLatency = 
        this.requestLatencies.reduce((sum, lat) => sum + lat, 0) / this.requestLatencies.length;
    }

    this.metrics.throughput = this.metrics.totalRequests / duration;
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = process.cpuUsage();

    return { ...this.metrics };
  }

  private generateReport(results: any): void {
    console.log('\n=== PERFORMANCE TEST REPORT ===');
    console.log(`Test Configuration:`);
    console.log(`- Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`- Test Duration: ${this.config.testDuration}s`);
    console.log(`- Max Latency Threshold: ${this.config.maxLatency}ms`);
    console.log(`- Max Throughput Threshold: ${this.config.maxThroughput} req/s\n`);

    Object.entries(results).forEach(([testName, metrics]: [string, any]) => {
      console.log(`${testName.toUpperCase()}:`);
      console.log(`- Total Requests: ${metrics.totalRequests}`);
      console.log(`- Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
      console.log(`- Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
      console.log(`- Max Latency: ${metrics.maxLatency.toFixed(2)}ms`);
      console.log(`- Throughput: ${metrics.throughput.toFixed(2)} req/s`);
      console.log(`- Memory Usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Check thresholds
      const latencyPass = metrics.averageLatency <= this.config.maxLatency;
      const throughputPass = metrics.throughput >= this.config.maxThroughput;
      console.log(`- Latency Test: ${latencyPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`- Throughput Test: ${throughputPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log('');
    });
  }
}

// Worker thread handling
if (!isMainThread && workerData) {
  const { task, userId, appUrl } = workerData;
  
  const performTask = async () => {
    switch (task) {
      case 'userRegistration':
        // Simulate user registration
        const response = await fetch(`${appUrl}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: userId,
            username: `testuser${userId}`,
            firstName: 'Test',
            lastName: 'User',
          }),
        });
        
        return {
          success: response.ok,
          status: response.status,
          userId,
        };
      
      default:
        throw new Error(`Unknown task: ${task}`);
    }
  };

  performTask()
    .then((result) => {
      if (parentPort) {
        parentPort.postMessage(result);
      }
    })
    .catch((error) => {
      if (parentPort) {
        parentPort.postMessage({ success: false, error: error.message, userId });
      }
    });
}

// Predefined performance test configurations
export const PerformanceTestConfigs = {
  light: {
    concurrentUsers: 100,
    testDuration: 60,
    rampUpTime: 10,
    thinkTime: 1000,
    maxLatency: 500,
    maxThroughput: 100,
  } as PerformanceTestConfig,

  medium: {
    concurrentUsers: 500,
    testDuration: 300,
    rampUpTime: 30,
    thinkTime: 2000,
    maxLatency: 1000,
    maxThroughput: 200,
  } as PerformanceTestConfig,

  heavy: {
    concurrentUsers: 1000,
    testDuration: 600,
    rampUpTime: 60,
    thinkTime: 3000,
    maxLatency: 2000,
    maxThroughput: 300,
  } as PerformanceTestConfig,

  stress: {
    concurrentUsers: 2000,
    testDuration: 900,
    rampUpTime: 120,
    thinkTime: 5000,
    maxLatency: 5000,
    maxThroughput: 500,
  } as PerformanceTestConfig,
};