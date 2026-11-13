export interface PlutosMonitorOptions {
  /**
   * Path prefix where the dashboard will be hosted (e.g. '/monitor').
   * @default '/monitor'
   */
  path?: string;

  /**
   * Dashboard authentication settings.
   */
  auth?: {
    enabled?: boolean;
    username?: string;
    /**
     * Plaintext password or pre-hashed password string.
     * @default 'plutos2026'
     */
    password?: string;
    secretKey?: string;
    sessionDurationSeconds?: number;
  };

  /**
   * Redis configuration for distributed cluster metrics & multi-instance PM2 aggregation.
   */
  redis?: {
    enabled?: boolean;
    /**
     * Existing Redis client instance (ioredis instance) or connection options.
     */
    client?: any;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };

  /**
   * Real-time request log stream settings.
   */
  liveLogs?: {
    enabled?: boolean;
    maxEntries?: number;
    sensitiveHeaders?: string[];
    sensitiveParams?: string[];
  };

  /**
   * History retention window in hours.
   * @default 168 (7 days)
   */
  retentionHours?: number;

  /**
   * Alerts configuration.
   */
  alerts?: AlertConfigOptions[];

  /**
   * Enable Prometheus `/metrics` endpoint on `path + '/prometheus'` or standalone.
   * @default true
   */
  prometheus?: {
    enabled?: boolean;
    endpoint?: string;
  };

  /**
   * Service dependency map manual overrides / explicit services.
   */
  serviceName?: string;
  environment?: string;
}

export interface AlertConfigOptions {
  id: string;
  name: string;
  metric: 'cpu' | 'ram' | 'event_loop_lag' | 'error_rate' | 'p95_latency' | 'rps';
  operator: '>' | '>=' | '<' | '<=' | '==';
  threshold: number;
  durationSeconds?: number;
  enabled: boolean;
}

export interface SystemMetrics {
  timestamp: number;
  instanceId: string;
  cpuPercent: number;
  ramUsageBytes: number;
  ramTotalBytes: number;
  ramPercent: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  eventLoopLagMs: number;
  uptimeSeconds: number;
  activeRequests: number;
  rps: number;
}

export interface RequestLogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  route?: string;
  statusCode: number;
  durationMs: number;
  clientIp?: string;
  userAgent?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  queryParams?: Record<string, any>;
  errorMessage?: string;
}

export interface EndpointMetric {
  path: string;
  method: string;
  totalRequests: number;
  totalErrors: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  peakRps: number;
  currentRps: number;
  lastRequestTimestamp: number;
}

export interface DatabaseMetric {
  dbType: 'mongodb' | 'postgres' | 'mysql' | 'redis';
  totalQueries: number;
  slowQueries: number;
  totalErrors: number;
  avgLatencyMs: number;
  lastQueryTimestamp: number;
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'app' | 'mongodb' | 'postgres' | 'mysql' | 'redis' | 'external_http';
  status: 'healthy' | 'degraded' | 'down';
  callsCount: number;
  avgLatencyMs: number;
  errorRatePercent: number;
}

export interface DependencyLink {
  source: string;
  target: string;
  callsCount: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface ProcessLifecycleEntry {
  timestamp: number;
  instanceId: string;
  pid: number;
  event: 'start' | 'restart' | 'shutdown';
  reason?: string;
}

export interface AlertStatus {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  lastTriggeredAt?: number;
}

export interface AggregatedDashboardData {
  system: SystemMetrics;
  historical: {
    '1h': SystemMetrics[];
    '24h': SystemMetrics[];
    '7d': SystemMetrics[];
  };
  endpoints: EndpointMetric[];
  databases: DatabaseMetric[];
  dependencies: {
    nodes: DependencyNode[];
    links: DependencyLink[];
  };
  liveLogs: RequestLogEntry[];
  alerts: AlertStatus[];
  restarts: ProcessLifecycleEntry[];
  overview: {
    totalRequests: number;
    totalErrors: number;
    errorRatePercent: number;
    avgLatencyMs: number;
    currentRps: number;
    peakRps: number;
    activeInstancesCount: number;
  };
}
