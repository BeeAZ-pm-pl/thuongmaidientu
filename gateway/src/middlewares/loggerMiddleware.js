/**
 * Middleware ghi log lưu lượng và đo lường độ trễ (Latency Tracking) tại API Gateway
 * Phát triển bởi: Nguyễn Công Đạt
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    console.log(`\x1b[34m[GATEWAY LOG]\x1b[0m ${method} ${originalUrl} -> ${color}${status}\x1b[0m (${duration}ms)`);
  });

  next();
};

module.exports = loggerMiddleware;
