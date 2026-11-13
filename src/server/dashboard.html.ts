export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plutos App Monitor</title>
  <style>
    :root {
      --bg-main: #0c0e14;
      --bg-sidebar: #090a0f;
      --bg-card: #131722;
      --bg-card-hover: #1a2030;
      --bg-pill: #1a2233;
      --border-color: #1e2638;
      --border-accent: #2d384e;
      --text-main: #f3f4f6;
      --text-muted: #8a94a6;
      --text-dim: #5c667a;
      --plutos-teal: #00f2fe;
      --plutos-blue: #3b82f6;
      --accent-gradient: linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-family);
      background-color: var(--bg-main);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Left Icon Navigation Rail */
    .rail-sidebar {
      width: 72px;
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      gap: 24px;
      z-index: 10;
    }

    .brand-logo-container {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .brand-logo-img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .nav-icon-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      align-items: center;
    }

    .rail-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .rail-btn svg {
      width: 20px;
      height: 20px;
      stroke-width: 2;
    }

    .rail-btn:hover {
      background-color: var(--bg-card-hover);
      color: var(--text-main);
    }

    .rail-btn.active {
      background-color: #1a2436;
      color: var(--plutos-teal);
      border-color: var(--border-accent);
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.15);
    }

    /* Main Container */
    .main-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header Bar */
    .top-navbar {
      height: 70px;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      background-color: var(--bg-main);
    }

    .page-heading {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .status-pill {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .status-pill::before {
      content: "";
      width: 6px;
      height: 6px;
      background-color: var(--success);
      border-radius: 50%;
    }

    .time-selector {
      display: flex;
      background: var(--bg-sidebar);
      border: 1px solid var(--border-color);
      padding: 3px;
      border-radius: 24px;
    }

    .time-btn {
      padding: 6px 16px;
      border-radius: 20px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .time-btn.active {
      background: var(--bg-pill);
      color: var(--text-main);
      font-weight: 600;
    }

    /* Content Area */
    .content-area {
      flex: 1;
      padding: 28px 32px;
      overflow-y: auto;
    }

    .tab-view { display: none; }
    .tab-view.active { display: block; }

    /* Top Stats Grid */
    .metrics-top-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card-pill {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-card-pill.highlight {
      background: linear-gradient(180deg, #1c283d 0%, #131722 100%);
      border-color: #2b3a52;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Primary Metric Section Cards */
    .metrics-main-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }

    .resource-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .resource-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #1a2233;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--plutos-teal);
    }

    .resource-name { font-size: 15px; font-weight: 600; }
    .resource-sub { font-size: 12px; color: var(--text-muted); }
    .resource-percent { font-size: 22px; font-weight: 700; color: var(--text-main); }

    /* Progress Bar */
    .progress-track {
      height: 6px;
      background-color: #1a2233;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent-gradient);
      border-radius: 4px;
      transition: width 0.4s ease;
    }

    /* Sparkline SVG Chart */
    .sparkline-svg {
      width: 100%;
      height: 48px;
      overflow: visible;
    }

    .sparkline-line {
      fill: none;
      stroke: var(--plutos-teal);
      stroke-width: 2;
    }

    /* Data Table styling */
    .table-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background-color: #0f131d;
      padding: 14px 20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 16px 20px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    tr:last-child td { border-bottom: none; }

    .tag-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }

    .tag-get { background: rgba(0, 242, 254, 0.15); color: var(--plutos-teal); }
    .tag-post { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .tag-error { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
  </style>
</head>
<body>

  <!-- Left Icon Rail Sidebar -->
  <aside class="rail-sidebar">
    <div class="brand-logo-container">
      <img src="https://www.plutos.one/images/new-home/logos/plutos%20white%20logo.svg" alt="Plutos Logo" class="brand-logo-img" />
    </div>

    <nav class="nav-icon-list">
      <button class="rail-btn active" title="Resources Overview" onclick="switchView('overview', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
      </button>

      <button class="rail-btn" title="API Endpoints" onclick="switchView('endpoints', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
      </button>

      <button class="rail-btn" title="Live Logs" onclick="switchView('logs', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      </button>

      <button class="rail-btn" title="Databases" onclick="switchView('databases', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14"></path><path d="M21 5v14"></path></svg>
      </button>

      <button class="rail-btn" title="Alerts & Status" onclick="switchView('alerts', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </button>
    </nav>
  </aside>

  <!-- Main Content Area -->
  <main class="main-workspace">
    <header class="top-navbar">
      <div class="page-heading">
        <h1 class="page-title" id="page-heading-title">Resources</h1>
        <span class="status-pill">Healthy</span>
      </div>

      <div class="time-selector">
        <button class="time-btn">5 min</button>
        <button class="time-btn active">15 min</button>
        <button class="time-btn">1 hour</button>
      </div>
    </header>

    <div class="content-area">
      <!-- Resources / Overview Tab -->
      <section id="tab-overview" class="tab-view active">
        <div class="metrics-top-grid">
          <div class="stat-card-pill highlight">
            <span class="stat-label">Uptime</span>
            <span class="stat-value" id="val-uptime">0d 0h 0m</span>
          </div>
          <div class="stat-card-pill">
            <span class="stat-label">Node Runtime</span>
            <span class="stat-value" id="val-node-version">v24.18.0</span>
          </div>
          <div class="stat-card-pill">
            <span class="stat-label">Process Mode</span>
            <span class="stat-value">Single process</span>
          </div>
          <div class="stat-card-pill">
            <span class="stat-label">Active Requests</span>
            <span class="stat-value" id="val-active-reqs">0</span>
          </div>
        </div>

        <div class="metrics-main-grid">
          <div class="resource-card">
            <div class="card-header-row">
              <div class="resource-title-group">
                <div class="icon-box">⚡</div>
                <div>
                  <div class="resource-name">CPU</div>
                  <div class="resource-sub">Multi-core processor utilization</div>
                </div>
              </div>
              <div class="resource-percent" id="val-cpu">0%</div>
            </div>
            <div class="progress-track"><div class="progress-fill" id="fill-cpu" style="width: 0%"></div></div>
            <svg class="sparkline-svg"><path class="sparkline-line" id="spark-cpu" d="M 0 30 L 500 30" /></svg>
          </div>

          <div class="resource-card">
            <div class="card-header-row">
              <div class="resource-title-group">
                <div class="icon-box">📊</div>
                <div>
                  <div class="resource-name">Container Memory</div>
                  <div class="resource-sub" id="sub-mem">0 GB of 1.0 GB used</div>
                </div>
              </div>
              <div class="resource-percent" id="val-ram">0%</div>
            </div>
            <div class="progress-track"><div class="progress-fill" id="fill-ram" style="width: 0%"></div></div>
            <svg class="sparkline-svg"><path class="sparkline-line" id="spark-ram" d="M 0 30 L 500 30" /></svg>
          </div>

          <div class="resource-card">
            <div class="card-header-row">
              <div class="resource-title-group">
                <div class="icon-box">📦</div>
                <div>
                  <div class="resource-name">Heap</div>
                  <div class="resource-sub">Allocated V8 JS heap memory</div>
                </div>
              </div>
              <div class="resource-percent" id="val-heap">0%</div>
            </div>
            <div class="progress-track"><div class="progress-fill" id="fill-heap" style="width: 0%"></div></div>
          </div>

          <div class="resource-card">
            <div class="card-header-row">
              <div class="resource-title-group">
                <div class="icon-box">⏱️</div>
                <div>
                  <div class="resource-name">Event loop lag</div>
                  <div class="resource-sub">Queue tick latency</div>
                </div>
              </div>
              <div class="resource-percent" id="val-lag">0 ms</div>
            </div>
            <div class="progress-track"><div class="progress-fill" id="fill-lag" style="width: 2%"></div></div>
          </div>
        </div>
      </section>

      <!-- API Endpoints Tab -->
      <section id="tab-endpoints" class="tab-view">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint Path</th>
                <th>Requests</th>
                <th>Errors</th>
                <th>Avg Latency</th>
                <th>P95 Latency</th>
              </tr>
            </thead>
            <tbody id="tbl-endpoints">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No endpoint telemetry recorded yet</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Live Logs Tab -->
      <section id="tab-logs" class="tab-view">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody id="tbl-logs">
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Listening for real-time request logs...</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Databases Tab -->
      <section id="tab-databases" class="tab-view">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Database</th>
                <th>Total Queries</th>
                <th>Slow Queries</th>
                <th>Errors</th>
                <th>Avg Latency</th>
              </tr>
            </thead>
            <tbody id="tbl-databases">
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No database query metrics recorded</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Alerts Tab -->
      <section id="tab-alerts" class="tab-view">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Alert Rule</th>
                <th>Metric</th>
                <th>Threshold</th>
                <th>Current Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="tbl-alerts">
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">All system alert checks clean</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>

  <script>
    function switchView(tabId, btn) {
      document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
      document.getElementById('page-heading-title').innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    }

    async function updateTelemetry() {
      try {
        const prefix = window.location.pathname.endsWith('/') ? window.location.pathname.slice(0, -1) : window.location.pathname;
        const res = await fetch(prefix + '/api/data');
        if (!res.ok) return;
        const data = await res.json();

        // System CPU & RAM
        document.getElementById('val-cpu').innerText = data.system.cpuPercent + '%';
        document.getElementById('fill-cpu').style.width = data.system.cpuPercent + '%';

        document.getElementById('val-ram').innerText = data.system.ramPercent + '%';
        document.getElementById('fill-ram').style.width = data.system.ramPercent + '%';

        document.getElementById('val-lag').innerText = data.system.eventLoopLagMs + ' ms';

        // Endpoints Table
        if (data.endpoints && data.endpoints.length > 0) {
          document.getElementById('tbl-endpoints').innerHTML = data.endpoints.map(e => \`
            <tr>
              <td><span class="tag-badge tag-get">\${e.method}</span></td>
              <td>\${e.path}</td>
              <td>\${e.totalRequests}</td>
              <td>\${e.totalErrors}</td>
              <td>\${e.avgLatencyMs} ms</td>
              <td>\${e.p95Ms} ms</td>
            </tr>
          \`).join('');
        }

        // Live Logs Table
        if (data.liveLogs && data.liveLogs.length > 0) {
          document.getElementById('tbl-logs').innerHTML = data.liveLogs.slice(0, 10).map(l => \`
            <tr>
              <td>\${new Date(l.timestamp).toLocaleTimeString()}</td>
              <td><span class="tag-badge \${l.method === 'GET' ? 'tag-get' : 'tag-post'}">\${l.method}</span></td>
              <td>\${l.path}</td>
              <td><span class="tag-badge \${l.statusCode >= 400 ? 'tag-error' : 'tag-get'}">\${l.statusCode}</span></td>
              <td>\${l.durationMs} ms</td>
            </tr>
          \`).join('');
        }

      } catch (e) {
        console.error('Failed to fetch monitor data:', e);
      }
    }

    setInterval(updateTelemetry, 2000);
    updateTelemetry();
  </script>
</body>
</html>`;
