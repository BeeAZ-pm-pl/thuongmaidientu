"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config();
const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const geminiApiKeys = rawKeys
    .split(',')
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter((k) => k.length > 0);
const config = {
    port: Number(process.env.PORT_CHAT || process.env.PORT || 8005),
    geminiApiKey: geminiApiKeys[0] || process.env.GEMINI_API_KEY || '',
    geminiApiKeys,
    geminiModel: process.env.GEMINI_MODEL || process.env.AI_CHATBOT_MODEL || 'gemini-flash-lite-latest',
    fallbackModels: ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'],
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
exports.default = config;
