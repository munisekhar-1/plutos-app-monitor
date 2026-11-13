import {
  SystemMetrics,
  RequestLogEntry,
  EndpointMetric,
  DatabaseMetric,
  DependencyNode,
  DependencyLink,
  ProcessLifecycleEntry,
  AlertStatus,
  AggregatedDashboardData,
} from '../types';
import { BoundedRingBuffer } from '../collectors/system.collector';

export interface StorageAdapter {
  recordMetrics(metrics: SystemMetrics): Promise<void>;
  recordRequestLog(log: RequestLogEntry): Promise<void>;
  recordEndpointLatency(path: string, method: string, statusCode: number, durationMs: number): Promise<void>;
  recordDatabaseQuery(dbType: 'mongodb' | 'postgres' | 'mysql' | 'redis', durationMs: number, isError: boolean): Promise<void>;
  recordDependencyCall(source: string, target: string, targetType: DependencyNode['type'], durationMs: number, isError: boolean): Promise<void>;
  getDashboardData(retentionHours?: number): Promise<AggregatedDashboardData>;
  close(): Promise<void>;
}

export class InMemoryStorage implements StorageAdapter {
  private history1h: BoundedRingBuffer<SystemMetrics> = new BoundedRingBuffer(60); // 60 snapshots (1 per min)
  private history24h: BoundedRingBuffer<SystemMetrics> = new BoundedRingBuffer(144); // 144 snapshots (1 per 10 min)
  private history7d: BoundedRingBuffer<SystemMetrics> = new BoundedRingBuffer(168); // 168 snapshots (1 per hr)
  
  private liveLogsBuffer: BoundedRingBuffer<RequestLogEntry>;
  private endpointMap: Map<string, {
    path: string;
    method: string;
    totalRequests: number;
    totalErrors: number;
    latenciesMs: number[];
    lastTimestamp: number;
    currentRpsCount: number;
    peakRps: number;
  }> = new Map();

  private databaseMetricsMap: Map<string, DatabaseMetric> = new Map();
  private dependencyNodesMap: Map<string, DependencyNode> = new Map();
  private dependencyLinksMap: Map<string, DependencyLink> = new Map();
  private lifecycleLogs: ProcessLifecycleEntry[] = [];
  
  private totalRequestCount: number = 0;
  private totalErrorCount: number = 0;
  private totalLatencySumMs: number = 0;
  private currentSecondRequests: number = 0;
  private currentRps: number = 0;
  private peakRps: number = 0;
  private rpsResetTimer: NodeJS.Timeout;

  constructor(maxLogEntries: number = 200) {
    this.liveLogsBuffer = new BoundedRingBuffer(maxLogEntries);

    // Calculate RPS every second
    this.rpsResetTimer = setInterval(() => {
      this.currentRps = this.currentSecondRequests;
      if (this.currentRps > this.peakRps) {
        this.peakRps = this.currentRps;
      }
      this.currentSecondRequests = 0;
    }, 1000);
    if (this.rpsResetTimer.unref) {
      this.rpsResetTimer.unref();
    }
  }

  public async recordMetrics(metrics: SystemMetrics): Promise<void> {
    this.history1h.push(metrics);
    this.history24h.push(metrics);
    this.history7d.push(metrics);
  }

  public async recordRequestLog(log: RequestLogEntry): Promise<void> {
    this.liveLogsBuffer.push(log);
  }

  public async recordEndpointLatency(path: string, method: string, statusCode: number, durationMs: number): Promise<void> {
    this.totalRequestCount++;
    this.totalLatencySumMs += durationMs;
    this.currentSecondRequests++;

    const isError = statusCode >= 400;
    if (isError) this.totalErrorCount++;

    const key = `${method.toUpperCase()} ${path}`;
    let ep = this.endpointMap.get(key);
    if (!ep) {
      ep = {
        path,
        method: method.toUpperCase(),
        totalRequests: 0,
        totalErrors: 0,
        latenciesMs: [],
        lastTimestamp: Date.now(),
        currentRpsCount: 0,
        peakRps: 0,
      };
      this.endpointMap.set(key, ep);
    }

    ep.totalRequests++;
    if (isError) ep.totalErrors++;
    ep.lastTimestamp = Date.now();

    // Bounded latencies array for percentile calculations (keep last 1000 sample points per endpoint)
    if (ep.latenciesMs.length >= 1000) {
      ep.latenciesMs.shift();
    }
    ep.latenciesMs.push(durationMs);
  }

  public async recordDatabaseQuery(dbType: 'mongodb' | 'postgres' | 'mysql' | 'redis', durationMs: number, isError: boolean): Promise<void> {
    let db = this.databaseMetricsMap.get(dbType);
    if (!db) {
      db = {
        dbType,
        totalQueries: 0,
        slowQueries: 0,
        totalErrors: 0,
        avgLatencyMs: 0,
        lastQueryTimestamp: Date.now(),
      };
      this.databaseMetricsMap.set(dbType, db);
    }

    const currentTotal = db.totalQueries;
    db.totalQueries++;
    if (isError) db.totalErrors++;
    if (durationMs > 100) db.slowQueries++;
    db.avgLatencyMs = parseFloat(((db.avgLatencyMs * currentTotal + durationMs) / db.totalQueries).toFixed(2));
    db.lastQueryTimestamp = Date.now();

    // Record automatically in dependency map
    await this.recordDependencyCall('AppService', dbType, dbType, durationMs, isError);
  }

  public async recordDependencyCall(source: string, target: string, targetType: DependencyNode['type'], durationMs: number, isError: boolean): Promise<void> {
    // Ensure nodes exist
    if (!this.dependencyNodesMap.has(source)) {
      this.dependencyNodesMap.set(source, {
        id: source,
        name: source,
        type: 'app',
        status: 'healthy',
        callsCount: 0,
        avgLatencyMs: 0,
        errorRatePercent: 0,
      });
    }

    let node = this.dependencyNodesMap.get(target);
    if (!node) {
      node = {
        id: target,
        name: target,
        type: targetType,
        status: 'healthy',
        callsCount: 0,
        avgLatencyMs: 0,
        errorRatePercent: 0,
      };
      this.dependencyNodesMap.set(target, node);
    }

    const currentCalls = node.callsCount;
    node.callsCount++;
    node.avgLatencyMs = parseFloat(((node.avgLatencyMs * currentCalls + durationMs) / node.callsCount).toFixed(2));
    if (isError) {
      const totalErrors = (node.errorRatePercent / 100) * currentCalls + 1;
      node.errorRatePercent = parseFloat(((totalErrors / node.callsCount) * 100).toFixed(2));
    } else {
      const totalErrors = (node.errorRatePercent / 100) * currentCalls;
      node.errorRatePercent = parseFloat(((totalErrors / node.callsCount) * 100).toFixed(2));
    }

    if (node.errorRatePercent > 20) {
      node.status = 'down';
    } else if (node.errorRatePercent > 5 || node.avgLatencyMs > 200) {
      node.status = 'degraded';
    } else {
      node.status = 'healthy';
    }

    // Link
    const linkKey = `${source}->${target}`;
    let link = this.dependencyLinksMap.get(linkKey);
    if (!link) {
      link = {
        source,
        target,
        callsCount: 0,
        avgLatencyMs: 0,
        errorCount: 0,
      };
      this.dependencyLinksMap.set(linkKey, link);
    }

    const lCalls = link.callsCount;
    link.callsCount++;
    if (isError) link.errorCount++;
    link.avgLatencyMs = parseFloat(((link.avgLatencyMs * lCalls + durationMs) / link.callsCount).toFixed(2));
  }

  public recordLifecycleEvent(entry: ProcessLifecycleEntry): void {
    this.lifecycleLogs.push(entry);
    if (this.lifecycleLogs.length > 50) this.lifecycleLogs.shift();
  }

  private calculatePercentile(latencies: number[], percentile: number): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return parseFloat((sorted[Math.max(0, index)] || 0).toFixed(2));
  }

  public async getDashboardData(): Promise<AggregatedDashboardData> {
    const endpoints: EndpointMetric[] = Array.from(this.endpointMap.values()).map((ep) => {
      const latencies = ep.latenciesMs;
      const sum = latencies.reduce((acc, v) => acc + v, 0);
      const avg = latencies.length > 0 ? sum / latencies.length : 0;

      return {
        path: ep.path,
        method: ep.method,
        totalRequests: ep.totalRequests,
        totalErrors: ep.totalErrors,
        avgLatencyMs: parseFloat(avg.toFixed(2)),
        p50Ms: this.calculatePercentile(latencies, 50),
        p95Ms: this.calculatePercentile(latencies, 95),
        p99Ms: this.calculatePercentile(latencies, 99),
        peakRps: ep.peakRps,
        currentRps: ep.currentRpsCount,
        lastRequestTimestamp: ep.lastTimestamp,
      };
    });

    const latestMetrics = this.history1h.toArray().slice(-1)[0] || {
      timestamp: Date.now(),
      instanceId: 'instance-1',
      cpuPercent: 0,
      ramUsageBytes: 0,
      ramTotalBytes: 0,
      ramPercent: 0,
      heapUsedBytes: 0,
      heapTotalBytes: 0,
      eventLoopLagMs: 0,
      uptimeSeconds: Math.floor(process.uptime()),
      activeRequests: 0,
      rps: this.currentRps,
    };

    const avgLatency = this.totalRequestCount > 0 ? parseFloat((this.totalLatencySumMs / this.totalRequestCount).toFixed(2)) : 0;
    const errorRate = this.totalRequestCount > 0 ? parseFloat(((this.totalErrorCount / this.totalRequestCount) * 100).toFixed(2)) : 0;

    return {
      system: latestMetrics,
      historical: {
        '1h': this.history1h.toArray(),
        '24h': this.history24h.toArray(),
        '7d': this.history7d.toArray(),
      },
      endpoints,
      databases: Array.from(this.databaseMetricsMap.values()),
      dependencies: {
        nodes: Array.from(this.dependencyNodesMap.values()),
        links: Array.from(this.dependencyLinksMap.values()),
      },
      liveLogs: this.liveLogsBuffer.toArray().reverse(),
      alerts: [],
      restarts: this.lifecycleLogs,
      overview: {
        totalRequests: this.totalRequestCount,
        totalErrors: this.totalErrorCount,
        errorRatePercent: errorRate,
        avgLatencyMs: avgLatency,
        currentRps: this.currentRps,
        peakRps: this.peakRps,
        activeInstancesCount: 1,
      },
    };
  }

  public async close(): Promise<void> {
    if (this.rpsResetTimer) {
      clearInterval(this.rpsResetTimer);
    }
  }
}
