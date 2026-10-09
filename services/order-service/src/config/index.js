const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

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
  },
  sepay: {
    apiUrl: process.env.SEPAY_API_URL || 'https://my.sepay.vn',
    apiKey: process.env.SEPAY_API_KEY || '',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    bankName: process.env.SEPAY_BANK_NAME || 'MBBank',
    bankCode: process.env.SEPAY_BANK_CODE || 'MB',
    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
    webhookToken: process.env.SEPAY_WEBHOOK_TOKEN || ''
  },
  ghn: {
    apiUrl: process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
    token: process.env.GHN_TOKEN || '',
    shopId: Number(process.env.GHN_SHOP_ID) || 0,
    fromName: process.env.GHN_FROM_NAME || 'NovaShop Logistics',
    fromPhone: process.env.GHN_FROM_PHONE || '0987654321',
    fromAddress: process.env.GHN_FROM_ADDRESS || 'Số 123 Đường Cầu Giấy',
    fromDistrictId: Number(process.env.GHN_FROM_DISTRICT_ID) || 1442,
    fromWardCode: String(process.env.GHN_FROM_WARD_CODE || '20101'),
    returnPhone: process.env.GHN_RETURN_PHONE || '0987654321',
    returnAddress: process.env.GHN_RETURN_ADDRESS || 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
    testMode: process.env.GHN_TEST_MODE === 'true',
    trackingUrl: process.env.GHN_TRACKING_URL || 'https://tracking.ghn.vn/?order_code='
  },
  momo: {
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    partnerCode: process.env.MOMO_PARTNER_CODE || '',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    verifySsl: process.env.MOMO_VERIFY_SSL === 'true',
    requestType: process.env.MOMO_REQUEST_TYPE || 'payWithATM',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:8000/api/orders/payment/momo/callback',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:8000/api/orders/payment/momo/ipn'
  }
};

