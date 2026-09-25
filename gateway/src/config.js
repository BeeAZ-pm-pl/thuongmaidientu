const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT_GATEWAY || process.env.PORT || 8000,
  services: {
    identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:8001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004'
  }
};
