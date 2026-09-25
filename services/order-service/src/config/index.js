const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT_ORDER || process.env.PORT || 8003,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  queueName: 'orders_queue',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db'
  }
};
