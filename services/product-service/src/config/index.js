const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT_PRODUCT || process.env.PORT || 8002,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db'
  }
};
