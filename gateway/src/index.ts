import express from 'express';
import cors from 'cors';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from './config';

const app = express();

app.use(cors());

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

app.use(
  createProxyMiddleware({
    target: config.services.chat,
    changeOrigin: true,
    pathFilter: '/api/chat'
  })
);

app.use('/admin/css', express.static(path.join(__dirname, '../../admin/css')));
app.use('/admin/js', express.static(path.join(__dirname, '../../admin/js')));

app.get(['/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/index.html'));
});

app.use(express.static(path.join(__dirname, '../../client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

app.listen(config.port, () => {
  console.log(`API Gateway is running on port ${config.port}`);
});

export default app;
