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

    if (!this.webhookToken || this.webhookToken === 'sepay_webhook_secret_key') {
      return true;
    }

    if (req.query && (req.query.token === this.webhookToken || String(req.query.token).toLowerCase() === this.webhookToken.toLowerCase())) {
      return true;
    }

    if (token && token.toLowerCase() === this.webhookToken.toLowerCase()) {
      return true;
    }

    if (req.body && (req.body.token === this.webhookToken || req.body.apiKey === this.webhookToken)) {
      return true;
    }

    return false;
  }

  extractOrderId(content) {
    if (!content || typeof content !== 'string') return null;

    // 1. Khớp chính xác dạng ORD_timestamp_rand
    const ordMatch = content.match(/(ORD_[0-9]+_[0-9]+|ord_[a-zA-Z0-9_-]+)/i);
    if (ordMatch) {
      return ordMatch[1];
    }

    // 2. Khớp trường hợp ngân hàng chuyển gạch dưới thành dấu cách: ORD 1728... 1234
    const ordSpaceMatch = content.match(/ORD\s*([0-9]{10,15})\s*([0-9]{3,5})/i);
    if (ordSpaceMatch) {
      return `ORD_${ordSpaceMatch[1]}_${ordSpaceMatch[2]}`;
    }

    // 3. Khớp trường hợp ngân hàng dính liền không dấu: ORD1728...1234
    const ordDenseMatch = content.match(/ORD([0-9]{10,15})([0-9]{4})/i);
    if (ordDenseMatch) {
      return `ORD_${ordDenseMatch[1]}_${ordDenseMatch[2]}`;
    }

    // 4. Khớp dạng DH ORD...
    const dhOrdMatch = content.match(/DH\s*(ORD[a-zA-Z0-9_-]+)/i);
    if (dhOrdMatch) {
      return dhOrdMatch[1];
    }

    // 5. Khớp dạng DH <id>
    const dhMatch = content.match(/DH\s*([a-zA-Z0-9_-]{5,})/i);
    if (dhMatch) {
      return dhMatch[1];
    }

    return null;
  }

  async checkTransactionsApi(order) {
    if (!this.apiKey || this.apiKey === 'sepay_demo_api_key_replace_me') {
      return null;
    }

    try {
      const url = `${this.apiUrl.replace(/\/+$/, '')}/userapi/transactions/list?limit=30`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Apikey ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[SePay API] Check transactions returned status ${response.status}`);
        return null;
      }

      const data = await response.json();
      const transactions = data.transactions || [];
      const orderAmount = Math.round(Number(order.totalAmount || 0));
      const cleanOrderId = order.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      for (const t of transactions) {
        const transAmount = Math.round(Number(t.amount_in || t.transferAmount || 0));
        const transContent = (t.transaction_content || t.content || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        if (transAmount >= orderAmount && (transContent.includes(cleanOrderId) || transContent.includes(order.id.toUpperCase()))) {
          return {
            id: String(t.id || t.reference_number || `SEPAY_${Date.now()}`),
            amount: transAmount,
            content: t.transaction_content || t.content
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('[SePay API] Error checking transactions:', err.message);
      return null;
    }
  }
}

module.exports = new SepayService();
