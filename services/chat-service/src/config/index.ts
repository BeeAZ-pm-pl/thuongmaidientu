import dotenv from 'dotenv';
dotenv.config();

export interface ChatConfig {
  port: number;
  geminiApiKey: string;
  geminiModel: string;
  productServiceUrl: string;
  orderServiceUrl: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

const config: ChatConfig = {
  port: Number(process.env.PORT_CHAT || process.env.PORT || 8005),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db'
  }
};

export default config;
