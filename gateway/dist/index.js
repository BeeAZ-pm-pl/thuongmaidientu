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
app.get('/admin/login', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../admin/login.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../admin/index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/register.html'));
});
app.get('/cart', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/cart.html'));
});
app.get('/orders', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/orders.html'));
});
app.use(express_1.default.static(path_1.default.join(__dirname, '../../client')));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/index.html'));
});
app.listen(config_1.default.port, () => {
    console.log(`API Gateway is running on port ${config_1.default.port}`);
});
exports.default = app;
