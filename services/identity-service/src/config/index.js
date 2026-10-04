const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT_IDENTITY || process.env.PORT || 8001,
  jwtSecret: process.env.JWT_SECRET || 'ecommerce_identity_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db'
  },
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USERNAME || '',
      pass: process.env.MAIL_PASSWORD || ''
    },
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@novashop.com',
    fromName: process.env.MAIL_FROM_NAME || 'NovaShop'
  }
};
