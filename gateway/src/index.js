const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const rateLimiter = require('./middlewares/rateLimiter');

const app = express();

app.use(cors());
app.use(loggerMiddleware);
app.use(rateLimiter({ windowMs: 60 * 1000, max: 150 }));

app.get('/api/health', async (req, res) => {
  const serviceStatuses = {};
  for (const [name, url] of Object.entries(config.services)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const pingUrl = name === 'identity'
        ? `${url}/api/auth/health`
        : (name === 'chat' ? `${url}/api/chat/health` : `${url}/health`);
      const response = await fetch(pingUrl, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
      serviceStatuses[name] = response && response.ok ? 'ONLINE' : 'UNREACHABLE';
    } catch {
      serviceStatuses[name] = 'OFFLINE';
    }
  }

  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
    downstream: serviceStatuses
  });
});

app.use(
  createProxyMiddleware({
    target: config.services.identity,
    changeOrigin: true,
    pathFilter: '/api/auth'
  })
);

app.use(
  createProxyMiddleware({
    target: config.services.product,
    changeOrigin: true,
    pathFilter: ['/api/products', '/api/categories']
  })
);

app.use(
  createProxyMiddleware({
    target: config.services.order,
    changeOrigin: true,
    pathFilter: ['/api/orders', '/api/cart']
  })
);

app.use(
  createProxyMiddleware({
    target: config.services.notification,
    changeOrigin: true,
    pathFilter: '/api/notifications'
  })
);

app.use(
  createProxyMiddleware({
    target: config.services.chat,
    changeOrigin: true,
    pathFilter: '/api/chat'
  })
);

app.use('/admin/css', express.static(path.join(__dirname, '../../admin/css')));
app.use('/admin/js', express.static(path.join(__dirname, '../../admin/js')));

const getAdminShell = () => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard | NovaShop Quản Trị</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
  <link rel="stylesheet" href="/admin/css/variables.css">
  <link rel="stylesheet" href="/admin/css/base.css">
  <link rel="stylesheet" href="/admin/css/admin.css">
  <link rel="stylesheet" href="/admin/css/modals.css">
  <link rel="stylesheet" href="/admin/css/admin-login.css">
</head>
<body>
  <div id="admin-app"></div>
  <div id="toastContainer" class="toast-container"></div>
  <script src="/admin/js/admin.js"></script>
</body>
</html>`;

const getClientShell = () => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaShop | Mua Sắm Trực Tuyến Chính Hãng</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/navbar.css">
  <link rel="stylesheet" href="/css/storefront.css">
  <link rel="stylesheet" href="/css/modals.css">
  <link rel="stylesheet" href="/css/cart.css">
  <link rel="stylesheet" href="/css/orders.css">
  <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
  <div id="app"></div>
  <div id="toastContainer" class="toast-container"></div>
  <script src="/js/app.js"></script>
</body>
</html>`;

app.get(['/admin', '/admin/*'], (req, res) => {
  res.type('html').send(getAdminShell());
});

app.use(express.static(path.join(__dirname, '../../client')));

app.get('*', (req, res) => {
  res.type('html').send(getClientShell());
});

app.listen(config.port, () => {
  console.log(`API Gateway is running on port ${config.port}`);
});

module.exports = app;
