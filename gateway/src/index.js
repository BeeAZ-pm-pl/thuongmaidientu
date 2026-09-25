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

app.get('/api/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date(),
    services: config.services
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

app.use('/admin/css', express.static(path.join(__dirname, '../../admin/css')));
app.use('/admin/js', express.static(path.join(__dirname, '../../admin/js')));

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/register.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/cart.html'));
});

app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/orders.html'));
});

app.use(express.static(path.join(__dirname, '../../client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

app.listen(config.port, () => {
  console.log(`API Gateway is running on port ${config.port}`);
});
