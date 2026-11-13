import client from 'prom-client';
import { AggregatedDashboardData } from '../types';

export class PrometheusExporter {
  private registry: client.Registry;
  private cpuGauge: client.Gauge;
  private ramGauge: client.Gauge;
  private rpsGauge: client.Gauge;
  private errorRateGauge: client.Gauge;
  private requestsTotalCounter: client.Counter;

  constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry, prefix: 'plutos_' });

    this.cpuGauge = new client.Gauge({
      name: 'plutos_cpu_usage_percent',
      help: 'Current CPU usage percentage',
      registers: [this.registry],
    });

    this.ramGauge = new client.Gauge({
      name: 'plutos_ram_usage_percent',
      help: 'Current RAM usage percentage',
      registers: [this.registry],
    });

    this.rpsGauge = new client.Gauge({
      name: 'plutos_current_rps',
      help: 'Current requests per second',
      registers: [this.registry],
    });

    this.errorRateGauge = new client.Gauge({
      name: 'plutos_error_rate_percent',
      help: 'Current HTTP error rate percentage',
      registers: [this.registry],
    });

    this.requestsTotalCounter = new client.Counter({
      name: 'plutos_http_requests_total',
      help: 'Total HTTP requests handled by application',
      labelNames: ['method', 'status_code'],
      registers: [this.registry],
    });
  }

  public updateMetrics(data: AggregatedDashboardData): void {
    this.cpuGauge.set(data.system.cpuPercent);
    this.ramGauge.set(data.system.ramPercent);
    this.rpsGauge.set(data.overview.currentRps);
    this.errorRateGauge.set(data.overview.errorRatePercent);
  }

  public async getMetricsText(): Promise<string> {
    return await this.registry.metrics();
  }

  public getContentType(): string {
    return this.registry.contentType;
  }
}
