const crypto = require('crypto');
const config = require('../config');

class MomoService {
  constructor() {
    this.endpoint = config.momo.endpoint;
    this.partnerCode = config.momo.partnerCode;
    this.accessKey = config.momo.accessKey;
    this.secretKey = config.momo.secretKey;
    this.redirectUrl = config.momo.redirectUrl;
    this.ipnUrl = config.momo.ipnUrl;
    this.requestType = config.momo.requestType || 'payWithATM';
  }

  async createPayment(order, customRequestType = null) {
    const requestType = customRequestType || this.requestType;
    const orderInfo = `Thanh toan don hang #${order.id}`;
    const amount = String(Math.round(Number(order.totalAmount)));
    const orderId = `${order.id}_${Date.now()}`;
    const requestId = String(Date.now());
    const extraData = String(order.id);

    const rawHash = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${this.ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${this.partnerCode}`,
      `redirectUrl=${this.redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawHash)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'NovaShop',
      storeId: 'NovaShopStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const result = await response.json();
      return {
        ...result,
        gatewayOrderId: orderId
      };
    } catch (err) {
      console.error('[MoMo] createPayment error:', err.message);
      return {
        resultCode: 99,
        message: `Lỗi kết nối API MoMo: ${err.message}`
      };
    }
  }

  isValidResponse(payload) {
    if (!payload || !payload.signature) return false;

    const rawHash = [
      `accessKey=${this.accessKey}`,
      `amount=${payload.amount || ''}`,
      `extraData=${payload.extraData || ''}`,
      `message=${payload.message || ''}`,
      `orderId=${payload.orderId || ''}`,
      `orderInfo=${payload.orderInfo || ''}`,
      `orderType=${payload.orderType || ''}`,
      `partnerCode=${payload.partnerCode || ''}`,
      `payType=${payload.payType || ''}`,
      `requestId=${payload.requestId || ''}`,
      `responseTime=${payload.responseTime || ''}`,
      `resultCode=${payload.resultCode !== undefined ? payload.resultCode : ''}`,
      `transId=${payload.transId || ''}`
    ].join('&');

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawHash)
      .digest('hex');

    return expectedSignature === payload.signature;
  }

  isSuccessful(payload) {
    return payload && String(payload.resultCode) === '0';
  }

  extractOrderId(payload) {
    if (payload.extraData) return String(payload.extraData);
    if (payload.orderId) {
      const parts = String(payload.orderId).split('_');
      if (parts.length >= 2) {
        return `${parts[0]}_${parts[1]}`;
      }
      return parts[0];
    }
    return null;
  }
}

module.exports = new MomoService();
