const { PlutosMonitorServer } = require('./dist/index.js');

async function testUnit() {
  console.log('Testing PlutosMonitorServer in-memory unit functionality...');
  
  const server = new PlutosMonitorServer({ path: '/monitor' });
  const storage = server.getStorage();

  // Test request latency recording
  await storage.recordEndpointLatency('/api/users', 'GET', 200, 15);
  await storage.recordEndpointLatency('/api/users', 'GET', 200, 25);
  await storage.recordEndpointLatency('/api/orders', 'POST', 500, 120);

  // Test database query instrumentation recording
  await storage.recordDatabaseQuery('mongodb', 45, false);
  await storage.recordDatabaseQuery('postgres', 150, false);
  await storage.recordDatabaseQuery('redis', 5, false);

  // Test system metrics collection
  await storage.recordMetrics({
    timestamp: Date.now(),
    instanceId: 'test-node-1',
    cpuPercent: 3.5,
    ramUsageBytes: 1024 * 1024 * 50,
    ramTotalBytes: 1024 * 1024 * 1024,
    ramPercent: 5.0,
    heapUsedBytes: 1024 * 1024 * 30,
    heapTotalBytes: 1024 * 1024 * 60,
    eventLoopLagMs: 0.2,
    uptimeSeconds: 120,
    activeRequests: 1,
    rps: 10,
  });

  const data = await storage.getDashboardData();

  console.log('--- VERIFICATION DATA RESULTS ---');
  console.log('Overview:', JSON.stringify(data.overview));
  console.log('Endpoints Recorded Count:', data.endpoints.length);
  console.log('Endpoints:', JSON.stringify(data.endpoints, null, 2));
  console.log('Databases Recorded:', JSON.stringify(data.databases, null, 2));
  
  if (data.endpoints.length === 2 && data.overview.totalRequests === 3) {
    console.log('PASSED ALL IN-MEMORY TELEMETRY UNIT TESTS SUCCESSFULLY!');
  } else {
    throw new Error('Telemetry count mismatch!');
  }

  await server.close();
}

testUnit().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
