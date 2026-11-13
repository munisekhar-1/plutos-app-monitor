export * from './types';
export * from './server/monitor.server';
export * from './security/security.manager';
export * from './collectors/system.collector';
export * from './storage/storage.adapter';
export * from './storage/redis.storage';
export * from './alerts/alerts.engine';
export * from './analytics/prometheus.exporter';
export * from './integrations/database.instrumentor';
export * from './integrations/nestjs.module';

import { PlutosMonitorServer } from './server/monitor.server';
import { PlutosMonitorOptions } from './types';

/**
 * Express Middleware helper export
 */
export function plutosMonitor(options?: PlutosMonitorOptions) {
  const server = new PlutosMonitorServer(options);
  return server.getExpressMiddleware();
}
