import { Request, Response, NextFunction } from 'express';
import { PlutosMonitorOptions, RequestLogEntry } from '../types';
import { SystemCollector } from '../collectors/system.collector';
import { StorageAdapter, InMemoryStorage } from '../storage/storage.adapter';
import { RedisStorage } from '../storage/redis.storage';
import { SecurityManager } from '../security/security.manager';
import { AlertsEngine } from '../alerts/alerts.engine';
import { PrometheusExporter } from '../analytics/prometheus.exporter';
import { DatabaseInstrumentor } from '../integrations/database.instrumentor';
import { DASHBOARD_HTML } from './dashboard.html';

export class PlutosMonitorServer {
  private options: PlutosMonitorOptions;
  private instanceId: string;
  private systemCollector: SystemCollector;
  private storage: StorageAdapter;
  private securityManager: SecurityManager;
  private alertsEngine: AlertsEngine;
  private prometheusExporter: PrometheusExporter;
  private dbInstrumentor: DatabaseInstrumentor;
  private activeRequestsCount: number = 0;
  private metricsSamplingInterval: NodeJS.Timeout;

  constructor(options?: PlutosMonitorOptions) {
    this.options = {
      path: '/monitor',
      retentionHours: 168,
      ...options,
    };

    this.instanceId = `node-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;
    this.systemCollector = new SystemCollector(this.instanceId);

    if (this.options.redis?.enabled || this.options.redis?.client || this.options.redis?.host) {
      this.storage = new RedisStorage({
        ...this.options.redis,
        maxLogEntries: this.options.liveLogs?.maxEntries || 200,
      });
    } else {
      this.storage = new InMemoryStorage(this.options.liveLogs?.maxEntries || 200);
    }

    this.securityManager = new SecurityManager(this.options.auth);
    this.alertsEngine = new AlertsEngine(this.options.alerts);
    this.prometheusExporter = new PrometheusExporter();
    this.dbInstrumentor = new DatabaseInstrumentor(this.storage);

    // Periodic sampling timer (every 5 seconds)
    this.metricsSamplingInterval = setInterval(async () => {
      try {
        const data = await this.storage.getDashboardData();
        const metrics = this.systemCollector.collect(this.activeRequestsCount, data.overview.currentRps);
        await this.storage.recordMetrics(metrics);

        // Evaluate alerts
        const activeAlerts = this.alertsEngine.evaluate(metrics, data.overview.errorRatePercent, data.overview.avgLatencyMs);
        data.alerts = activeAlerts;

        if (this.options.prometheus?.enabled !== false) {
          this.prometheusExporter.updateMetrics(data);
        }
      } catch (err) {
        // Non-blocking: safeguard application execution
      }
    }, 5000);

    if (this.metricsSamplingInterval.unref) {
      this.metricsSamplingInterval.unref();
    }
  }

  public getStorage(): StorageAdapter {
    return this.storage;
  }

  public getDatabaseInstrumentor(): DatabaseInstrumentor {
    return this.dbInstrumentor;
  }

  /**
   * Primary Express / NestJS Middleware Handler
   */
  public getExpressMiddleware() {
    const basePath = this.options.path || '/monitor';

    return async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl || req.url;

      // Handle Dashboard & Monitoring Endpoints
      if (url.startsWith(basePath)) {
        const subPath = url.substring(basePath.length);

        // Serve HTML Dashboard
        if (subPath === '' || subPath === '/' || subPath === '/index.html') {
          res.set(this.securityManager.getSecurityHeaders());
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(DASHBOARD_HTML);
        }

        // Serve API Data
        if (subPath === '/api/data') {
          res.set(this.securityManager.getSecurityHeaders());
          const data = await this.storage.getDashboardData();
          return res.json(data);
        }

        // Serve Prometheus Metrics
        if (subPath === '/prometheus' || subPath === '/metrics') {
          if (this.options.prometheus?.enabled !== false) {
            res.setHeader('Content-Type', this.prometheusExporter.getContentType());
            const text = await this.prometheusExporter.getMetricsText();
            return res.send(text);
          }
        }
      }

      // Track Incoming Request
      this.activeRequestsCount++;
      const startTime = Date.now();

      res.on('finish', async () => {
        this.activeRequestsCount = Math.max(0, this.activeRequestsCount - 1);
        const durationMs = Date.now() - startTime;

        const cleanPath = req.route?.path || req.path || url.split('?')[0];
        const method = req.method;

        // Record Endpoint Latency
        await this.storage.recordEndpointLatency(cleanPath, method, res.statusCode, durationMs);

        // Record Request Log (if live logs enabled)
        if (this.options.liveLogs?.enabled !== false) {
          const logEntry: RequestLogEntry = {
            id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: startTime,
            method,
            path: cleanPath,
            statusCode: res.statusCode,
            durationMs,
            clientIp: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
            requestHeaders: this.securityManager.redactHeaders(req.headers),
            queryParams: this.securityManager.redactQueryParams(req.query),
          };
          await this.storage.recordRequestLog(logEntry);
        }
      });

      next();
    };
  }

  public async close(): Promise<void> {
    if (this.metricsSamplingInterval) {
      clearInterval(this.metricsSamplingInterval);
    }
    this.systemCollector.destroy();
    await this.storage.close();
  }
}
