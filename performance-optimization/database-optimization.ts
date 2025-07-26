import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tournament } from '../entities/tournament.entity';
import { Game } from '../entities/game.entity';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';

/**
 * Database Optimization Service
 * 
 * @description Provides advanced database optimization techniques for the RPS Tournament Bot.
 * Implements query optimization, indexing strategies, caching patterns, and performance monitoring
 * to ensure sub-200ms response times under high load.
 * 
 * Features:
 * - Query optimization and analysis
 * - Advanced indexing strategies
 * - Connection pool management
 * - Query result caching
 * - Performance monitoring and alerting
 * - Automated maintenance tasks
 */
@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);
  
  // Query performance cache
  private queryCache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>
  ) {
    this.initializeOptimizations();
  }

  /**
   * Initialize database optimizations and monitoring
   */
  private async initializeOptimizations(): Promise<void> {
    try {
      // Create optimized indexes
      await this.createOptimizedIndexes();
      
      // Setup query monitoring
      this.setupQueryMonitoring();
      
      // Schedule maintenance tasks
      this.scheduleMaintenanceTasks();
      
      this.logger.log('Database optimizations initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database optimizations', error);
    }
  }

  /**
   * Create high-performance database indexes
   */
  private async createOptimizedIndexes(): Promise<void> {
    const indexQueries = [
      // Tournament performance indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournaments_active_performance 
       ON tournaments (status, start_time, current_participants) 
       WHERE status IN ('ACTIVE', 'REGISTRATION', 'READY')`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournaments_leaderboard
       ON tournaments (status, end_time DESC, current_participants DESC)
       WHERE status = 'COMPLETED'`,
      
      // Game performance indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_active_lookup
       ON games (status, tournament_id, created_at)
       WHERE status IN ('WAITING_FOR_PLAYERS', 'WAITING_FOR_MOVES')`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_player_history
       ON games (player1_id, created_at DESC)
       WHERE status = 'COMPLETED'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_player2_history
       ON games (player2_id, created_at DESC)
       WHERE status = 'COMPLETED'`,
      
      // User statistics indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_leaderboard
       ON user_stats (elo_rating DESC, wins DESC, total_games)
       WHERE total_games >= 5`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_active
       ON user_stats (last_game_at DESC, total_games DESC)
       WHERE last_game_at > NOW() - INTERVAL '30 days'`,
      
      // Tournament participant indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_participants_lookup
       ON tournament_participants (tournament_id, joined_at)`,
      
      // Composite indexes for complex queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournaments_search
       ON tournaments (status, visibility, created_at DESC, max_participants)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_tournament_player
       ON games (tournament_id, player1_id, player2_id, status)`
    ];

    for (const query of indexQueries) {
      try {
        await this.dataSource.query(query);
        this.logger.log(`Created index: ${query.split('idx_')[1]?.split(' ')[0]}`);
      } catch (error) {
        // Index might already exist, log but don't fail
        this.logger.warn(`Index creation warning: ${error.message}`);
      }
    }
  }

  /**
   * Optimized tournament queries
   */
  async getActiveTournamentsOptimized(limit: number = 20): Promise<Tournament[]> {
    const cacheKey = `active_tournaments_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT t.*, 
             u.username as creator_username,
             COUNT(tp.id) as current_participants
      FROM tournaments t
      LEFT JOIN users u ON t.created_by_id = u.id
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE t.status IN ('ACTIVE', 'REGISTRATION', 'READY')
        AND t.current_participants < t.max_participants
      GROUP BY t.id, u.username
      ORDER BY t.created_at DESC
      LIMIT $1
    `;

    const result = await this.dataSource.query(query, [limit]);
    this.setCache(cacheKey, result);
    
    return result;
  }

  /**
   * Optimized leaderboard query with pagination
   */
  async getLeaderboardOptimized(page: number = 1, limit: number = 50): Promise<{
    users: any[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;
    const cacheKey = `leaderboard_${page}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Use optimized query with index
    const [users, totalCount] = await Promise.all([
      this.dataSource.query(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.elo_rating,
          us.wins,
          us.losses,
          us.total_games,
          us.win_streak,
          us.best_streak,
          us.last_game_at,
          RANK() OVER (ORDER BY u.elo_rating DESC, us.wins DESC) as rank
        FROM users u
        JOIN user_stats us ON u.id = us.user_id
        WHERE us.total_games >= 5
        ORDER BY u.elo_rating DESC, us.wins DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      
      this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM users u
        JOIN user_stats us ON u.id = us.user_id  
        WHERE us.total_games >= 5
      `)
    ]);

    const total = parseInt(totalCount[0].count);
    const result = {
      users,
      total,
      hasMore: offset + limit < total
    };

    this.setCache(cacheKey, result, 3 * 60 * 1000); // Cache for 3 minutes
    return result;
  }

  /**
   * Optimized player game history
   */
  async getPlayerGameHistoryOptimized(
    playerId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Game[]> {
    const cacheKey = `player_history_${playerId}_${limit}_${offset}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Use union query with proper indexes
    const query = `
      (
        SELECT g.*, 
               p1.username as player1_username,
               p2.username as player2_username,
               t.name as tournament_name
        FROM games g
        LEFT JOIN users p1 ON g.player1_id = p1.id
        LEFT JOIN users p2 ON g.player2_id = p2.id  
        LEFT JOIN tournaments t ON g.tournament_id = t.id
        WHERE g.player1_id = $1 AND g.status = 'COMPLETED'
      ) 
      UNION ALL
      (
        SELECT g.*,
               p1.username as player1_username, 
               p2.username as player2_username,
               t.name as tournament_name
        FROM games g
        LEFT JOIN users p1 ON g.player1_id = p1.id
        LEFT JOIN users p2 ON g.player2_id = p2.id
        LEFT JOIN tournaments t ON g.tournament_id = t.id  
        WHERE g.player2_id = $1 AND g.status = 'COMPLETED'
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.dataSource.query(query, [playerId, limit, offset]);
    this.setCache(cacheKey, result);
    
    return result;
  }

  /**
   * Optimized tournament statistics
   */
  async getTournamentStatisticsOptimized(tournamentId: string): Promise<{
    participantCount: number;
    completedGames: number;
    totalGames: number;
    averageGameDuration: number;
    topPlayers: any[];
  }> {
    const cacheKey = `tournament_stats_${tournamentId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [participantCount, gameStats, topPlayers] = await Promise.all([
      // Participant count (using cached count from tournament entity)
      this.dataSource.query(`
        SELECT current_participants 
        FROM tournaments 
        WHERE id = $1
      `, [tournamentId]),

      // Game statistics
      this.dataSource.query(`
        SELECT 
          COUNT(*) as total_games,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_games,
          AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds END) as avg_duration
        FROM games 
        WHERE tournament_id = $1
      `, [tournamentId]),

      // Top players in tournament
      this.dataSource.query(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          COUNT(g.id) as games_played,
          COUNT(CASE WHEN g.winner_id = u.id THEN 1 END) as games_won,
          CASE 
            WHEN COUNT(g.id) > 0 
            THEN ROUND((COUNT(CASE WHEN g.winner_id = u.id THEN 1 END)::DECIMAL / COUNT(g.id)) * 100, 1)
            ELSE 0 
          END as win_rate
        FROM users u
        JOIN tournament_participants tp ON u.id = tp.user_id
        LEFT JOIN games g ON (g.player1_id = u.id OR g.player2_id = u.id) 
          AND g.tournament_id = $1 AND g.status = 'COMPLETED'
        WHERE tp.tournament_id = $1
        GROUP BY u.id, u.username, u.display_name
        ORDER BY games_won DESC, win_rate DESC
        LIMIT 10
      `, [tournamentId])
    ]);

    const result = {
      participantCount: participantCount[0]?.current_participants || 0,
      completedGames: parseInt(gameStats[0]?.completed_games || '0'),
      totalGames: parseInt(gameStats[0]?.total_games || '0'),
      averageGameDuration: parseFloat(gameStats[0]?.avg_duration || '0'),
      topPlayers
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Batch user statistics update (optimized for performance)
   */
  async batchUpdateUserStats(gameResults: Array<{
    playerId: string;
    result: 'win' | 'loss' | 'draw';
    move: string;
    duration: number;
  }>): Promise<void> {
    if (gameResults.length === 0) return;

    // Use single transaction for all updates
    await this.dataSource.transaction(async (manager) => {
      // Batch update using SQL for better performance
      const updatePromises = gameResults.map(({ playerId, result, move, duration }) => {
        return manager.query(`
          UPDATE user_stats 
          SET 
            total_games = total_games + 1,
            wins = wins + CASE WHEN $2 = 'win' THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN $2 = 'loss' THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN $2 = 'draw' THEN 1 ELSE 0 END,
            total_game_time = total_game_time + $3,
            rock_count = rock_count + CASE WHEN $4 = 'ROCK' THEN 1 ELSE 0 END,
            paper_count = paper_count + CASE WHEN $4 = 'PAPER' THEN 1 ELSE 0 END,
            scissors_count = scissors_count + CASE WHEN $4 = 'SCISSORS' THEN 1 ELSE 0 END,
            last_game_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $1
        `, [playerId, result, duration, move]);
      });

      await Promise.all(updatePromises);

      // Clear relevant caches
      this.clearCachePattern('leaderboard_*');
      this.clearCachePattern('player_stats_*');
    });

    this.logger.log(`Batch updated ${gameResults.length} user statistics`);
  }

  /**
   * Database health check and optimization
   */
  async performHealthCheck(): Promise<{
    connectionPool: any;
    queryPerformance: any;
    indexUsage: any;
    recommendations: string[];
  }> {
    const [connectionInfo, slowQueries, indexStats] = await Promise.all([
      this.getConnectionPoolInfo(),
      this.getSlowQueries(),
      this.getIndexUsageStats()
    ]);

    const recommendations = this.generateOptimizationRecommendations(
      connectionInfo,
      slowQueries,
      indexStats
    );

    return {
      connectionPool: connectionInfo,
      queryPerformance: { slowQueries: slowQueries.length, queries: slowQueries.slice(0, 5) },
      indexUsage: indexStats,
      recommendations
    };
  }

  /**
   * Setup query monitoring and logging
   */
  private setupQueryMonitoring(): void {
    // Enable query logging for slow queries
    this.dataSource.setOptions({
      ...this.dataSource.options,
      logging: ['error', 'warn', 'migration'],
      logger: 'advanced-console',
      maxQueryExecutionTime: 1000 // Log queries taking more than 1 second
    });

    this.logger.log('Query monitoring enabled');
  }

  /**
   * Schedule maintenance tasks
   */
  private scheduleMaintenanceTasks(): void {
    // Clear query cache every 5 minutes
    setInterval(() => {
      this.clearExpiredCache();
    }, 5 * 60 * 1000);

    // Analyze table statistics every hour
    setInterval(() => {
      this.analyzeTableStatistics();
    }, 60 * 60 * 1000);

    // Vacuum analyze every night at 2 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        this.performVacuumAnalyze();
      }
    }, 60 * 1000);

    this.logger.log('Maintenance tasks scheduled');
  }

  /**
   * Cache management methods
   */
  private getFromCache(key: string): any {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCachePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.queryCache.keys()) {
      if (regex.test(key)) {
        this.queryCache.delete(key);
      }
    }
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - (value as any).timestamp > (value as any).ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  // Database analysis methods
  private async getConnectionPoolInfo(): Promise<any> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      return result[0];
    } catch (error) {
      this.logger.error('Failed to get connection pool info', error);
      return {};
    }
  }

  private async getSlowQueries(): Promise<any[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          query,
          mean_time,
          calls,
          total_time
        FROM pg_stat_statements 
        WHERE mean_time > 100
        ORDER BY mean_time DESC 
        LIMIT 10
      `);
      return result;
    } catch (error) {
      // pg_stat_statements might not be available
      return [];
    }
  }

  private async getIndexUsageStats(): Promise<any[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC
        LIMIT 20
      `);
      return result;
    } catch (error) {
      this.logger.error('Failed to get index usage stats', error);
      return [];
    }
  }

  private generateOptimizationRecommendations(
    connectionInfo: any,
    slowQueries: any[],
    indexStats: any[]
  ): string[] {
    const recommendations = [];

    if (connectionInfo.active_connections > 80) {
      recommendations.push('Consider increasing connection pool size or optimizing connection usage');
    }

    if (slowQueries.length > 5) {
      recommendations.push('Multiple slow queries detected - review query optimization');
    }

    const unusedIndexes = indexStats.filter(idx => idx.idx_scan === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(`${unusedIndexes.length} unused indexes found - consider dropping them`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Database performance is optimal');
    }

    return recommendations;
  }

  private async analyzeTableStatistics(): Promise<void> {
    try {
      await this.dataSource.query('ANALYZE');
      this.logger.log('Table statistics updated');
    } catch (error) {
      this.logger.error('Failed to analyze table statistics', error);
    }
  }

  private async performVacuumAnalyze(): Promise<void> {
    try {
      await this.dataSource.query('VACUUM ANALYZE');
      this.logger.log('Vacuum analyze completed');
    } catch (error) {
      this.logger.error('Failed to perform vacuum analyze', error);
    }
  }
}