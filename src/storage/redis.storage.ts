import { StorageAdapter, InMemoryStorage } from './storage.adapter';
import {
  SystemMetrics,
  RequestLogEntry,
  EndpointMetric,
  DatabaseMetric,
  DependencyNode,
  DependencyLink,
  ProcessLifecycleEntry,
  AggregatedDashboardData,
} from '../types';

export class RedisStorage implements StorageAdapter {
  private redisClient: any;
  private inMemoryFallback: InMemoryStorage;
  private keyPrefix: string;
  private isConnected: boolean = false;

  constructor(options: {
    client?: any;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxLogEntries?: number;
  }) {
    this.inMemoryFallback = new InMemoryStorage(options.maxLogEntries || 200);
    this.keyPrefix = options.keyPrefix || 'plutos:monitor:';

    if (options.client) {
      this.redisClient = options.client;
      this.isConnected = true;
    } else if (options.host) {
      try {
        // Dynamic requiring of ioredis to remain purely optional
        const Redis = require('ioredis');
        this.redisClient = new Redis({
          host: options.host,
          port: options.port || 6379,
          password: options.password,
          db: options.db || 0,
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });

        this.redisClient.connect().then(() => {
          this.isConnected = true;
        }).catch((err: any) => {
          console.warn('[PlutosMonitor] Redis connection failed, falling back to In-Memory mode:', err.message);
          this.isConnected = false;
        });

        this.redisClient.on('error', (err: any) => {
          this.isConnected = false;
        });
        this.redisClient.on('connect', () => {
          this.isConnected = true;
        });
      } catch (e) {
        console.warn('[PlutosMonitor] ioredis module not found. Operating in In-Memory mode.');
        this.isConnected = false;
      }
    }
  }

  public async recordMetrics(metrics: SystemMetrics): Promise<void> {
    // Always update in-memory fallback first
    await this.inMemoryFallback.recordMetrics(metrics);

    if (!this.isConnected || !this.redisClient) return;

    try {
      const key = `${this.keyPrefix}metrics:1h`;
      const payload = JSON.stringify(metrics);
      // Non-blocking background write to Redis list
      this.redisClient.lpush(key, payload).then(() => {
        this.redisClient.ltrim(key, 0, 1000);
      }).catch(() => {});
    } catch {
      // Ignore Redis async failure to guarantee app request safety
    }
  }

  public async recordRequestLog(log: RequestLogEntry): Promise<void> {
    await this.inMemoryFallback.recordRequestLog(log);
    if (!this.isConnected || !this.redisClient) return;

    try {
      const key = `${this.keyPrefix}logs`;
      this.redisClient.lpush(key, JSON.stringify(log)).then(() => {
        this.redisClient.ltrim(key, 0, 500);
      }).catch(() => {});
    } catch {}
  }

  public async recordEndpointLatency(path: string, method: string, statusCode: number, durationMs: number): Promise<void> {
    await this.inMemoryFallback.recordEndpointLatency(path, method, statusCode, durationMs);
  }

  public async recordDatabaseQuery(dbType: 'mongodb' | 'postgres' | 'mysql' | 'redis', durationMs: number, isError: boolean): Promise<void> {
    await this.inMemoryFallback.recordDatabaseQuery(dbType, durationMs, isError);
  }

  public async recordDependencyCall(source: string, target: string, targetType: DependencyNode['type'], durationMs: number, isError: boolean): Promise<void> {
    await this.inMemoryFallback.recordDependencyCall(source, target, targetType, durationMs, isError);
  }

  public recordLifecycleEvent(entry: ProcessLifecycleEntry): void {
    this.inMemoryFallback.recordLifecycleEvent(entry);
  }

  public async getDashboardData(retentionHours?: number): Promise<AggregatedDashboardData> {
    // Merge local metrics with Redis aggregated multi-instance cluster data if available
    const localData = await this.inMemoryFallback.getDashboardData();

    if (!this.isConnected || !this.redisClient) {
      return localData;
    }

    try {
      const rawLogs = await this.redisClient.lrange(`${this.keyPrefix}logs`, 0, 100);
      if (rawLogs && rawLogs.length > 0) {
        localData.liveLogs = rawLogs.map((l: string) => JSON.parse(l));
      }
    } catch {}

    return localData;
  }

  public async close(): Promise<void> {
    await this.inMemoryFallback.close();
    if (this.redisClient && typeof this.redisClient.quit === 'function') {
      try {
        await this.redisClient.quit();
      } catch {}
    }
  }
}
