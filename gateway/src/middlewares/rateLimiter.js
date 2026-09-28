const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 120;
  const message = options.message || 'Quá nhiều yêu cầu từ địa chỉ IP của bạn. Vui lòng thử lại sau 1 phút.';

  const clients = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clients.entries()) {
      if (now - data.startTime > windowMs) {
        clients.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    if (req.path.startsWith('/admin/css') || req.path.startsWith('/admin/js') || req.path.startsWith('/css') || req.path.startsWith('/js')) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = clients.get(ip);
    if (!clientData || now - clientData.startTime > windowMs) {
      clientData = {
        count: 1,
        startTime: now
      };
      clients.set(ip, clientData);
    } else {
      clientData.count++;
    }

    const remaining = Math.max(0, max - clientData.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (clientData.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((clientData.startTime + windowMs - now) / 1000)
      });
    }

    next();
  };
};

module.exports = rateLimiter;
