import express from 'express';
import request from 'supertest';
import { PlutosMonitorServer, plutosMonitor } from '../src/index';

describe('PlutosAppMonitor Integration & Unit Tests', () => {
  let app: express.Application;
  let monitorServer: PlutosMonitorServer;

  beforeEach(() => {
    app = express();
    monitorServer = new PlutosMonitorServer({
      path: '/monitor',
      auth: { enabled: false },
    });

    app.use(monitorServer.getExpressMiddleware());

    app.get('/api/users', (req, res) => {
      res.json([{ id: 1, name: 'Plutos' }]);
    });

    app.get('/api/error', (req, res) => {
      res.status(500).json({ error: 'Internal Error' });
    });
  });

  afterEach(async () => {
    if (monitorServer) {
      await monitorServer.close();
    }
  });

  test('should serve Plutos dashboard HTML page', async () => {
    const res = await request(app).get('/monitor');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Plutos App Monitor');
  });

  test('should serve monitoring JSON telemetry endpoint', async () => {
    const res = await request(app).get('/monitor/api/data');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('system');
    expect(res.body).toHaveProperty('overview');
    expect(res.body).toHaveProperty('endpoints');
  });

  test('should track incoming HTTP request latencies and endpoint statistics', async () => {
    await request(app).get('/api/users');
    await request(app).get('/api/error');

    const res = await request(app).get('/monitor/api/data');
    expect(res.body.overview.totalRequests).toBeGreaterThanOrEqual(2);
    expect(res.body.endpoints.length).toBeGreaterThan(0);
  });
});
