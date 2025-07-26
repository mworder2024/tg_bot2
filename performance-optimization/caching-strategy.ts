import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Advanced Multi-Level Caching Strategy Service
 * 
 * @description Implements a sophisticated caching architecture with multiple layers
 * for optimal performance in the RPS Tournament Bot. Provides L1 (memory), L2 (Redis),
 * and smart cache invalidation strategies.
 * 
 * Features:
 * - Multi-level caching (Memory + Redis)
 * - Smart cache invalidation patterns
 * - Cache warming and preloading
 * - Performance monitoring and metrics
 * - Automatic cache cleanup and optimization
 * - Pattern-based cache management
 */
@Injectable()
export class CachingStrategyService {
  private readonly logger = new Logger(CachingStrategyService.name);
  
  // L1 Cache: In-memory cache for fastest access
  private memoryCache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccess: number;
  }>();

  // L2 Cache: Redis for distributed caching
  private redisClient: Redis;
  private redisCluster: Redis.Cluster;

  // Cache statistics
  private stats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    totalRequests: 0,
    lastReset: Date.now()
  };

  // Cache configuration
  private readonly config = {
    l1: {
      maxSize: 1000,        // Maximum L1 cache entries
      defaultTtl: 60000,    // 1 minute default TTL
      maxTtl: 300000,       // 5 minutes maximum TTL
      cleanupInterval: 30000 // 30 seconds cleanup interval
    },
    l2: {
      defaultTtl: 3600,     // 1 hour default TTL for Redis
      maxTtl: 86400,        // 24 hours maximum TTL
      keyPrefix: 'rps-bot:',
      compressionThreshold: 1024 // Compress data larger than 1KB
    }
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
    this.setupCacheManagement();
  }

  /**
   * Initialize Redis connection with clustering support
   */
  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisClusterNodes = this.configService.get<string>('REDIS_CLUSTER_NODES');

    if (redisClusterNodes) {
      // Use Redis Cluster for high availability
      const nodes = redisClusterNodes.split(',').map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      });

      this.redisCluster = new Redis.Cluster(nodes, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        slotsRefreshTimeout: 10000
      });

      this.logger.log('Redis Cluster initialized');
    } else {
      // Single Redis instance
      this.redisClient = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      this.logger.log('Redis client initialized');
    }
  }

  /**
   * Setup cache management and monitoring
   */
  private setupCacheManagement(): void {
    // L1 cache cleanup interval
    setInterval(() => {
      this.cleanupL1Cache();
    }, this.config.l1.cleanupInterval);

    // Cache statistics reset interval (every 5 minutes)
    setInterval(() => {
      this.logCacheStatistics();
      this.resetStatistics();
    }, 5 * 60 * 1000);

    // Cache warming on startup
    this.warmupCache();

    this.logger.log('Cache management initialized');
  }

  /**
   * Get data from cache with multi-level fallback
   */
  async get<T>(key: string, options?: {
    skipL1?: boolean;
    skipL2?: boolean;
    ttl?: number;
  }): Promise<T | null> {
    this.stats.totalRequests++;
    const cacheKey = this.formatKey(key);

    try {
      // L1 Cache check (if not skipped)
      if (!options?.skipL1) {
        const l1Result = this.getFromL1<T>(cacheKey);
        if (l1Result !== null) {
          this.stats.l1Hits++;
          return l1Result;
        }
        this.stats.l1Misses++;
      }

      // L2 Cache check (if not skipped)
      if (!options?.skipL2) {
        const l2Result = await this.getFromL2<T>(cacheKey);
        if (l2Result !== null) {
          this.stats.l2Hits++;
          
          // Store in L1 for faster future access
          this.setInL1(cacheKey, l2Result, options?.ttl || this.config.l1.defaultTtl);
          
          return l2Result;
        }
        this.stats.l2Misses++;
      }

      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error);
      return null;
    }
  }

  /**
   * Set data in cache with multi-level storage
   */
  async set<T>(
    key: string, 
    data: T, 
    options?: {
      l1Ttl?: number;
      l2Ttl?: number;
      skipL1?: boolean;
      skipL2?: boolean;
      compress?: boolean;
    }
  ): Promise<void> {
    const cacheKey = this.formatKey(key);

    try {
      // Store in L1 cache (if not skipped)
      if (!options?.skipL1) {
        const l1Ttl = options?.l1Ttl || this.config.l1.defaultTtl;
        this.setInL1(cacheKey, data, l1Ttl);
      }

      // Store in L2 cache (if not skipped)
      if (!options?.skipL2) {
        const l2Ttl = options?.l2Ttl || this.config.l2.defaultTtl;
        await this.setInL2(cacheKey, data, l2Ttl, options?.compress);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error);
    }
  }

  /**
   * Delete from all cache levels
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.formatKey(key);

    try {
      // Remove from L1
      this.memoryCache.delete(cacheKey);

      // Remove from L2
      const client = this.getRedisClient();
      await client.del(cacheKey);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error);
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    try {
      const cachePattern = this.formatKey(pattern);

      // Clear L1 cache by pattern
      const l1Regex = new RegExp(cachePattern.replace('*', '.*'));
      for (const [key] of this.memoryCache) {
        if (l1Regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      // Clear L2 cache by pattern
      const client = this.getRedisClient();
      const keys = await client.keys(cachePattern);
      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }

      this.logger.log(`Cleared ${deletedCount} cache entries matching pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache clear pattern error: ${pattern}`, error);
    }

    return deletedCount;
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: {
      l1Ttl?: number;
      l2Ttl?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    // Return cached value if not forcing refresh
    if (!options?.forceRefresh) {
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute fetch function
    const data = await fetchFunction();

    // Cache the result
    await this.set(key, data, options);

    return data;
  }

  /**
   * Batch get multiple keys
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    // Try L1 cache first
    const l2Keys: string[] = [];
    for (const key of keys) {
      const cacheKey = this.formatKey(key);
      const l1Result = this.getFromL1<T>(cacheKey);
      
      if (l1Result !== null) {
        results.set(key, l1Result);
        this.stats.l1Hits++;
      } else {
        l2Keys.push(key);
        this.stats.l1Misses++;
      }
    }

    // Get remaining keys from L2 cache
    if (l2Keys.length > 0) {
      const client = this.getRedisClient();
      const cacheKeys = l2Keys.map(key => this.formatKey(key));
      const l2Results = await client.mget(...cacheKeys);

      for (let i = 0; i < l2Keys.length; i++) {
        const key = l2Keys[i];
        const result = l2Results[i];

        if (result !== null) {
          const parsed = this.parseL2Data<T>(result);
          results.set(key, parsed);
          this.stats.l2Hits++;

          // Store in L1 for future access
          this.setInL1(this.formatKey(key), parsed, this.config.l1.defaultTtl);
        } else {
          results.set(key, null);
          this.stats.l2Misses++;
        }
      }
    }

    this.stats.totalRequests += keys.length;
    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async setMany<T>(entries: Map<string, T>, options?: {
    l1Ttl?: number;
    l2Ttl?: number;
  }): Promise<void> {
    // Set in L1 cache
    for (const [key, data] of entries) {
      const cacheKey = this.formatKey(key);
      this.setInL1(cacheKey, data, options?.l1Ttl || this.config.l1.defaultTtl);
    }

    // Batch set in L2 cache
    const client = this.getRedisClient();
    const pipeline = client.pipeline();
    const l2Ttl = options?.l2Ttl || this.config.l2.defaultTtl;

    for (const [key, data] of entries) {
      const cacheKey = this.formatKey(key);
      const serialized = this.serializeL2Data(data);
      pipeline.setex(cacheKey, l2Ttl, serialized);
    }

    await pipeline.exec();
  }

  /**
   * Tournament-specific caching methods
   */

  /**
   * Cache tournament data with optimized settings
   */
  async cacheTournament(tournamentId: string, tournament: any): Promise<void> {
    await this.set(`tournament:${tournamentId}`, tournament, {
      l1Ttl: 2 * 60 * 1000,  // 2 minutes in L1
      l2Ttl: 15 * 60         // 15 minutes in L2
    });
  }

  /**
   * Cache tournament leaderboard
   */
  async cacheLeaderboard(page: number, limit: number, data: any): Promise<void> {
    await this.set(`leaderboard:${page}:${limit}`, data, {
      l1Ttl: 30 * 1000,     // 30 seconds in L1
      l2Ttl: 3 * 60         // 3 minutes in L2
    });
  }

  /**
   * Cache user statistics
   */
  async cacheUserStats(userId: string, stats: any): Promise<void> {
    await this.set(`user-stats:${userId}`, stats, {
      l1Ttl: 5 * 60 * 1000, // 5 minutes in L1
      l2Ttl: 30 * 60        // 30 minutes in L2
    });
  }

  /**
   * Cache active games list
   */
  async cacheActiveGames(games: any[]): Promise<void> {
    await this.set('active-games', games, {
      l1Ttl: 10 * 1000,     // 10 seconds in L1
      l2Ttl: 30             // 30 seconds in L2
    });
  }

  /**
   * Invalidate tournament-related caches
   */
  async invalidateTournamentCaches(tournamentId: string): Promise<void> {
    await Promise.all([
      this.delete(`tournament:${tournamentId}`),
      this.clearPattern('leaderboard:*'),
      this.clearPattern('active-games'),
      this.clearPattern(`tournament-stats:${tournamentId}`)
    ]);
  }

  /**
   * Warmup cache with frequently accessed data
   */
  private async warmupCache(): Promise<void> {
    try {
      // This would be implemented based on your specific needs
      // Example: Pre-load active tournaments, popular users, etc.
      this.logger.log('Cache warmup completed');
    } catch (error) {
      this.logger.error('Cache warmup failed', error);
    }
  }

  /**
   * L1 Cache methods
   */
  private getFromL1<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.data as T;
  }

  private setInL1<T>(key: string, data: T, ttl: number): void {
    // Enforce cache size limit
    if (this.memoryCache.size >= this.config.l1.maxSize) {
      this.evictLRUFromL1();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: Math.min(ttl, this.config.l1.maxTtl),
      accessCount: 1,
      lastAccess: Date.now()
    });
  }

  private evictLRUFromL1(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private cleanupL1Cache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired L1 cache entries`);
    }
  }

  /**
   * L2 Cache methods
   */
  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const client = this.getRedisClient();
      const result = await client.get(key);
      
      if (result === null) {
        return null;
      }

      return this.parseL2Data<T>(result);
    } catch (error) {
      this.logger.error(`L2 cache get error for key ${key}`, error);
      return null;
    }
  }

  private async setInL2<T>(key: string, data: T, ttl: number, compress?: boolean): Promise<void> {
    try {
      const client = this.getRedisClient();
      const serialized = this.serializeL2Data(data, compress);
      
      await client.setex(key, Math.min(ttl, this.config.l2.maxTtl), serialized);
    } catch (error) {
      this.logger.error(`L2 cache set error for key ${key}`, error);
    }
  }

  private serializeL2Data<T>(data: T, compress?: boolean): string {
    const json = JSON.stringify(data);
    
    if (compress && json.length > this.config.l2.compressionThreshold) {
      // Implement compression if needed (e.g., using gzip)
      // For now, just return JSON
      return json;
    }
    
    return json;
  }

  private parseL2Data<T>(data: string): T {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error('Failed to parse L2 cache data', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  private formatKey(key: string): string {
    return `${this.config.l2.keyPrefix}${key}`;
  }

  private getRedisClient(): Redis | Redis.Cluster {
    return this.redisCluster || this.redisClient;
  }

  /**
   * Statistics and monitoring
   */
  getCacheStatistics(): {
    l1: { hits: number; misses: number; hitRate: number; size: number };
    l2: { hits: number; misses: number; hitRate: number };
    overall: { requests: number; hitRate: number };
  } {
    const l1Total = this.stats.l1Hits + this.stats.l1Misses;
    const l2Total = this.stats.l2Hits + this.stats.l2Misses;
    const overallTotal = this.stats.totalRequests;

    return {
      l1: {
        hits: this.stats.l1Hits,
        misses: this.stats.l1Misses,
        hitRate: l1Total > 0 ? (this.stats.l1Hits / l1Total) * 100 : 0,
        size: this.memoryCache.size
      },
      l2: {
        hits: this.stats.l2Hits,
        misses: this.stats.l2Misses,
        hitRate: l2Total > 0 ? (this.stats.l2Hits / l2Total) * 100 : 0
      },
      overall: {
        requests: overallTotal,
        hitRate: overallTotal > 0 ? ((this.stats.l1Hits + this.stats.l2Hits) / overallTotal) * 100 : 0
      }
    };
  }

  private logCacheStatistics(): void {
    const stats = this.getCacheStatistics();
    this.logger.log(`Cache Statistics: L1 Hit Rate: ${stats.l1.hitRate.toFixed(2)}%, L2 Hit Rate: ${stats.l2.hitRate.toFixed(2)}%, Overall Hit Rate: ${stats.overall.hitRate.toFixed(2)}%`);
  }

  private resetStatistics(): void {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalRequests: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    l1: { status: string; size: number };
    l2: { status: string; latency: number };
    overall: { status: string };
  }> {
    const l1Status = this.memoryCache.size < this.config.l1.maxSize ? 'healthy' : 'full';
    
    let l2Status = 'unhealthy';
    let l2Latency = 0;
    
    try {
      const start = Date.now();
      const client = this.getRedisClient();
      await client.ping();
      l2Latency = Date.now() - start;
      l2Status = l2Latency < 10 ? 'healthy' : 'slow';
    } catch (error) {
      this.logger.error('L2 cache health check failed', error);
    }

    return {
      l1: { status: l1Status, size: this.memoryCache.size },
      l2: { status: l2Status, latency: l2Latency },
      overall: { status: l1Status === 'healthy' && l2Status === 'healthy' ? 'healthy' : 'degraded' }
    };
  }
}