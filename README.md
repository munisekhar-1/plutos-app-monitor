# Plutos App Monitor (`plutos-app-monitor`)

> A lightweight, fast, secure, production-grade monitoring dashboard for Node.js applications with first-class support for **NestJS** and **Express**.

![Plutos Monitor Dashboard](https://www.plutos.one/images/new-home/logos/plutos%20white%20logo.svg)

---

## Features

- ⚡ **Lightweight & Fast**: Non-blocking instrumentation with minimal overhead on application requests.
- 📊 **Comprehensive Metrics**: CPU, RAM, heap memory, event loop lag, process uptime, and restart history.
- ⚡ **API Analytics**: Real-time RPS (current, average, peak), request counts, and latency percentiles (**P50, P95, P99**).
- 🗄️ **Database Instrumentation**: Out-of-the-box performance tracking for **MongoDB**, **PostgreSQL**, **MySQL**, and **Redis**.
- 🪵 **Live Logs**: Configurable real-time log streaming with automatic sensitive data redaction (`passwords`, `tokens`, `cookies`).
- 🔄 **Cluster & Multi-Instance Support**: Optional Redis storage engine for distributed cluster aggregation. Automatically falls back to bounded in-memory storage if Redis is omitted.
- 🎨 **Plutos Branded Dashboard**: Modern dark theme with left-rail icon navigation, custom Plutos branding, and responsive UI. Zero external CDN dependencies.
- 🚨 **Alerting & Thresholds**: Configurable triggers for high CPU/RAM usage, event loop lag, and error spikes.
- 📈 **Prometheus Metrics**: Built-in `/metrics` endpoint for Prometheus scraping.

---

## Installation

```bash
npm install plutos-app-monitor
```

---

## Quick Start

### 1. Express Integration

```javascript
const express = require('express');
const { PlutosMonitorServer } = require('plutos-app-monitor');

const app = express();

// Initialize Plutos Monitor
const monitor = new PlutosMonitorServer({
  title: 'My Express App',
  path: '/monitor',
  port: 3000,
  auth: {
    enabled: true,
    username: 'admin',
    password: 'SuperSecretPassword123!'
  }
});

// Register Middleware
app.use(monitor.getMiddleware());

// Sample Endpoints
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(3000, () => {
  console.log('App running on http://localhost:3000');
  console.log('Dashboard available at http://localhost:3000/monitor');
});
```

---

### 2. NestJS Integration

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PlutosModule } from 'plutos-app-monitor';

@Module({
  imports: [
    PlutosModule.forRoot({
      path: '/monitor',
      title: 'NestJS Plutos App',
      auth: {
        enabled: true,
        username: 'admin',
        password: 'SuperSecretPassword123!'
      },
      liveLogs: {
        enabled: true,
        maxEntries: 100,
        redactKeys: ['password', 'authorization', 'cookie']
      }
    })
  ]
})
export class AppModule {}
```

---

## Redis Configuration (Optional)

By default, `plutos-app-monitor` operates in **zero-config bounded in-memory mode**. To persist metrics across app restarts or aggregate metrics across a PM2 / Kubernetes multi-instance cluster, provide a Redis configuration or pass an existing Redis client instance:

```javascript
const monitor = new PlutosMonitorServer({
  path: '/monitor',
  redis: {
    enabled: true,
    host: '127.0.0.1',
    port: 6379,
    password: 'redis_password',
    prefix: 'plutos_monitor:'
  }
});
```

---

## Security Features

- **Authentication by Default**: PBKDF2 password hashing (100k iterations) and secure session cookies.
- **Redaction Engine**: Automatic masking of `password`, `token`, `secret`, `authorization`, `cookie`, and `apiKey` fields in headers and request parameters.
- **Strict Headers**: Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict CSP headers.
- **Local Assets Only**: Bundles all CSS, JS, and SVG assets locally. No external CDN calls are made.

---

## Prometheus Metrics Endpoint

Enable the Prometheus exporter to scrape metrics at `/monitor/prometheus` (or custom endpoint):

```javascript
const monitor = new PlutosMonitorServer({
  path: '/monitor',
  prometheus: {
    enabled: true,
    path: '/prometheus'
  }
});
```

Metrics scrapable include:
- `node_cpu_utilization_percent`
- `node_memory_usage_bytes`
- `http_requests_total`
- `http_request_duration_ms`

---

## License

[MIT](LICENSE)
