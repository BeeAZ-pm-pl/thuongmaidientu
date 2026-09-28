import dotenv from 'dotenv';
dotenv.config();

export interface GatewayConfig {
  port: number;
  services: {
    identity: string;
    product: string;
    order: string;
    notification: string;
    chat: string;
  };
}

const config: GatewayConfig = {
  port: Number(process.env.PORT_GATEWAY || process.env.PORT || 8000),
  services: {
    identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:8001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004',
    chat: process.env.CHAT_SERVICE_URL || 'http://localhost:8005'
  }
};

export default config;
