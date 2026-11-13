const express = require('express');
const http = require('http');
const { PlutosMonitorServer } = require('./dist/index.js');

const app = express();
const monitor = new PlutosMonitorServer({ path: '/monitor' });

app.use(monitor.getExpressMiddleware());

app.get('/test', (req, res) => res.json({ status: 'ok' }));

const server = app.listen(0, () => {
  const port = server.address().port;
  console.log('Verification server running on port ' + port);

  http.get('http://localhost:' + port + '/test', (res1) => {
    http.get('http://localhost:' + port + '/monitor/api/data', (res2) => {
      let body = '';
      res2.on('data', chunk => body += chunk);
      res2.on('end', () => {
        const json = JSON.parse(body);
        console.log('SUCCESS: Monitored total requests:', json.overview.totalRequests);
        console.log('SUCCESS: System metrics collected:', json.system);
        server.close();
      });
    });
  });
});
