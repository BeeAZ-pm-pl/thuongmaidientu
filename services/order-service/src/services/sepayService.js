const config = require('../config');

class SepayService {
  constructor() {
    this.apiUrl = config.sepay.apiUrl;
    this.apiKey = config.sepay.apiKey;
    this.accountNumber = config.sepay.accountNumber;
    this.bankName = config.sepay.bankName;
    this.bankCode = config.sepay.bankCode;
    this.accountName = config.sepay.accountName;
    this.webhookToken = config.sepay.webhookToken;
  }

  generatePaymentInfo(order) {
    const amount = Math.round(Number(order.totalAmount || 0));
    const transferContent = `DH ${order.id}`;
    const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(this.accountNumber)}&bank=${encodeURIComponent(this.bankCode)}&amount=${amount}&des=${encodeURIComponent(transferContent)}`;

    return {
      orderId: order.id,
      amount,
      accountNumber: this.accountNumber,
      bankName: this.bankName,
      bankCode: this.bankCode,
      accountName: this.accountName,
      transferContent,
      qrUrl,
      trackingStatusUrl: `/api/orders/${order.id}`
    };
  }

  verifyWebhookToken(req) {
    const authHeader = req.headers['authorization'] || req.headers['apikey'] || req.headers['x-api-key'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').replace(/^Apikey\s+/i, '').trim();

    if (req.query && req.query.token === this.webhookToken) {
      return true;
    }

    if (!this.webhookToken || this.webhookToken === 'sepay_webhook_secret_key') {
      return true;
    }

    return token === this.webhookToken;
  }

  extractOrderId(content) {
    if (!content || typeof content !== 'string') return null;

    const ordMatch = content.match(/(ORD_[0-9]+_[0-9]+|ord_[a-zA-Z0-9_-]+)/i);
    if (ordMatch) {
      return ordMatch[1];
    }

    const dhMatch = content.match(/DH\s*([a-zA-Z0-9_-]+)/i);
    if (dhMatch) {
      return dhMatch[1];
    }

    return null;
  }
}

module.exports = new SepayService();
