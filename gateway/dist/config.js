"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    port: Number(process.env.PORT_GATEWAY || process.env.PORT || 8000),
    services: {
        identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:8001',
        product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
        order: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004',
        chat: process.env.CHAT_SERVICE_URL || 'http://localhost:8005'
    }
};
exports.default = config;
