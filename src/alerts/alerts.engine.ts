import { AlertConfigOptions, AlertStatus, SystemMetrics } from '../types';

export class AlertsEngine {
  private alerts: AlertConfigOptions[] = [];
  private triggeredState: Map<string, { triggered: boolean; lastTriggeredAt?: number }> = new Map();

  constructor(initialAlerts?: AlertConfigOptions[]) {
    this.alerts = initialAlerts || [
      {
        id: 'alert-cpu-high',
        name: 'High CPU Usage',
        metric: 'cpu',
        operator: '>',
        threshold: 85,
        enabled: true,
      },
      {
        id: 'alert-ram-high',
        name: 'High Memory Usage',
        metric: 'ram',
        operator: '>',
        threshold: 90,
        enabled: true,
      },
      {
        id: 'alert-eventloop-lag',
        name: 'Event Loop Delay (>100ms)',
        metric: 'event_loop_lag',
        operator: '>',
        threshold: 100,
        enabled: true,
      },
      {
        id: 'alert-high-error-rate',
        name: 'High Error Rate (>5%)',
        metric: 'error_rate',
        operator: '>',
        threshold: 5,
        enabled: true,
      },
    ];
  }

  public evaluate(system: SystemMetrics, errorRatePercent: number, avgLatencyMs: number): AlertStatus[] {
    const statuses: AlertStatus[] = [];

    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      let currentValue = 0;
      switch (alert.metric) {
        case 'cpu':
          currentValue = system.cpuPercent;
          break;
        case 'ram':
          currentValue = system.ramPercent;
          break;
        case 'event_loop_lag':
          currentValue = system.eventLoopLagMs;
          break;
        case 'error_rate':
          currentValue = errorRatePercent;
          break;
        case 'p95_latency':
          currentValue = avgLatencyMs;
          break;
        case 'rps':
          currentValue = system.rps;
          break;
      }

      let isTriggered = false;
      switch (alert.operator) {
        case '>':
          isTriggered = currentValue > alert.threshold;
          break;
        case '>=':
          isTriggered = currentValue >= alert.threshold;
          break;
        case '<':
          isTriggered = currentValue < alert.threshold;
          break;
        case '<=':
          isTriggered = currentValue <= alert.threshold;
          break;
        case '==':
          isTriggered = currentValue === alert.threshold;
          break;
      }

      const state = this.triggeredState.get(alert.id);
      let lastTriggeredAt = state?.lastTriggeredAt;
      if (isTriggered && !state?.triggered) {
        lastTriggeredAt = Date.now();
      }

      this.triggeredState.set(alert.id, { triggered: isTriggered, lastTriggeredAt });

      statuses.push({
        id: alert.id,
        name: alert.name,
        metric: alert.metric,
        threshold: alert.threshold,
        currentValue,
        triggered: isTriggered,
        lastTriggeredAt,
      });
    }

    return statuses;
  }

  public getAlerts(): AlertConfigOptions[] {
    return [...this.alerts];
  }

  public setAlerts(alerts: AlertConfigOptions[]): void {
    this.alerts = alerts;
  }
}
