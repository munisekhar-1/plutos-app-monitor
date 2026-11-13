const http = require('http');
const { PlutosMonitorServer } = require('./dist/index.js');

const monitor = new PlutosMonitorServer({ path: '/monitor' });
const middleware = monitor.getExpressMiddleware();

const server = http.createServer((req, res) => {
  // Simple mock response wrapper for Express middleware compatibility test
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  res.send = (data) => {
    res.end(data);
  };
  res.set = (headers) => {
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
  };

  middleware(req, res, () => {
    if (req.url === '/test') {
      res.json({ status: 'ok' });
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
});

server.listen(0, () => {
  const port = server.address().port;
  console.log('HTTP verification server listening on port ' + port);

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
