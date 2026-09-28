"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const config_1 = __importDefault(require("./config"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.get('/api/health', (req, res) => {
    res.json({
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date(),
        services: config_1.default.services
    });
});
app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.default.services.identity,
    changeOrigin: true,
    pathFilter: '/api/auth'
}));
app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.default.services.product,
    changeOrigin: true,
    pathFilter: ['/api/products', '/api/categories']
}));
app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.default.services.order,
    changeOrigin: true,
    pathFilter: ['/api/orders', '/api/cart']
}));
app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.default.services.notification,
    changeOrigin: true,
    pathFilter: '/api/notifications'
}));
app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.default.services.chat,
    changeOrigin: true,
    pathFilter: '/api/chat'
}));
app.use('/admin/css', express_1.default.static(path_1.default.join(__dirname, '../../admin/css')));
app.use('/admin/js', express_1.default.static(path_1.default.join(__dirname, '../../admin/js')));
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
app.use(express_1.default.static(path_1.default.join(__dirname, '../../client')));
app.get('*', (req, res) => {
    res.type('html').send(getClientShell());
});
app.listen(config_1.default.port, () => {
    console.log(`API Gateway is running on port ${config_1.default.port}`);
});
exports.default = app;
