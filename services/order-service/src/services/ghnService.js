const config = require('../config');

function normalizeLocation(s) {
  return (s || '').toLowerCase()
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(tinh|thanh pho|tp\.|tp|quan|q\.|huyen|h\.|thi xa|tx\.|tx|phuong|p\.|xa|thi tran|tt\.)\s*/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

class GhnService {
  constructor() {
    this.apiUrl = config.ghn.apiUrl;
    this.token = config.ghn.token;
    this.shopId = config.ghn.shopId;
    this.fromDistrictId = config.ghn.fromDistrictId;
    this.fromWardCode = config.ghn.fromWardCode;
    this.fromName = config.ghn.fromName;
    this.fromPhone = config.ghn.fromPhone;
    this.fromAddress = config.ghn.fromAddress;
    this.returnPhone = config.ghn.returnPhone;
    this.returnAddress = config.ghn.returnAddress;
    this.trackingUrl = config.ghn.trackingUrl;
    this.provincesCache = null;
    this.districtsCache = new Map();
    this.wardsCache = new Map();
  }

  async getProvinces() {
    if (this.provincesCache && this.provincesCache.length > 0) {
      return this.provincesCache;
    }
    try {
      const response = await fetch(`${this.apiUrl}/master-data/province`, {
        method: 'GET',
        headers: {
          Token: this.token,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data && data.code === 200 && Array.isArray(data.data)) {
        this.provincesCache = data.data.sort((a, b) =>
          (a.ProvinceName || '').localeCompare(b.ProvinceName || '', 'vi')
        );
        return this.provincesCache;
      }
      return [];
    } catch (err) {
      console.error('[GHN] getProvinces error:', err.message);
      return [];
    }
  }

  async getDistricts(provinceId) {
    const pId = Number(provinceId);
    if (this.districtsCache.has(pId)) {
      return this.districtsCache.get(pId);
    }
    try {
      const response = await fetch(`${this.apiUrl}/master-data/district`, {
        method: 'POST',
        headers: {
          Token: this.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ province_id: pId })
      });
      const data = await response.json();
      if (data && data.code === 200 && Array.isArray(data.data)) {
        const sorted = data.data.sort((a, b) =>
          (a.DistrictName || '').localeCompare(b.DistrictName || '', 'vi')
        );
        this.districtsCache.set(pId, sorted);
        return sorted;
      }
      return [];
    } catch (err) {
      console.error('[GHN] getDistricts error:', err.message);
      return [];
    }
  }

  async getWards(districtId) {
    const dId = Number(districtId);
    if (this.wardsCache.has(dId)) {
      return this.wardsCache.get(dId);
    }
    try {
      const response = await fetch(
        `${this.apiUrl}/master-data/ward?district_id=${dId}`,
        {
          method: 'GET',
          headers: {
            Token: this.token,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      if (data && data.code === 200 && Array.isArray(data.data)) {
        const sorted = data.data.sort((a, b) =>
          (a.WardName || '').localeCompare(b.WardName || '', 'vi')
        );
        this.wardsCache.set(dId, sorted);
        return sorted;
      }
      return [];
    } catch (err) {
      console.error('[GHN] getWards error:', err.message);
      return [];
    }
  }

  async lookupWard(provinceId, keyword) {
    if (!provinceId || !keyword) return null;
    const cleanTarget = normalizeLocation(keyword);
    if (!cleanTarget || cleanTarget.length < 2) return null;

    const districts = await this.getDistricts(provinceId);
    if (!districts || districts.length === 0) return null;

    // Lần duyệt 1: Tìm Exact Match (khớp 100% tên xã/phường/thị trấn)
    for (const dist of districts) {
      const wards = await this.getWards(dist.DistrictID);
      for (const w of wards) {
        const names = [w.WardName, ...(w.NameExtension || [])].filter(Boolean);
        const hasExact = names.some(n => normalizeLocation(n) === cleanTarget);
        if (hasExact) {
          return { district: dist, ward: w };
        }
      }
    }

    // Lần duyệt 2: Tìm Contains Match (nếu không có exact match)
    if (cleanTarget.length >= 3) {
      for (const dist of districts) {
        const wards = await this.getWards(dist.DistrictID);
        for (const w of wards) {
          const names = [w.WardName, ...(w.NameExtension || [])].filter(Boolean);
          const hasContains = names.some(n => {
            const clean = normalizeLocation(n);
            return clean.length >= 3 && (clean.includes(cleanTarget) || cleanTarget.includes(clean));
          });
          if (hasContains) {
            return { district: dist, ward: w };
          }
        }
      }
    }

    return null;
  }

  async calculateFee({ toDistrictId, toWardCode, weight = 300, length = 20, width = 15, height = 10, insuranceValue = 0, serviceTypeId = 2 }) {
    try {
      const payload = {
        service_type_id: Number(serviceTypeId) || 2,
        from_district_id: Number(this.fromDistrictId),
        to_district_id: Number(toDistrictId),
        to_ward_code: String(toWardCode),
        height: Math.max(5, Math.round(Number(height) || 10)),
        length: Math.max(10, Math.round(Number(length) || 20)),
        width: Math.max(10, Math.round(Number(width) || 15)),
        weight: Math.max(100, Math.round(Number(weight) || 300)),
        insurance_value: Math.min(5000000, Math.max(0, Math.round(Number(insuranceValue) || 0)))
      };

      const response = await fetch(`${this.apiUrl}/v2/shipping-order/fee`, {
        method: 'POST',
        headers: {
          Token: this.token,
          ShopId: String(this.shopId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data && data.code === 200 && data.data && data.data.total !== undefined) {
        return {
          success: true,
          total: Number(data.data.total),
          service_fee: Number(data.data.service_fee || data.data.total),
          insurance_fee: Number(data.data.insurance_fee || 0)
        };
      }

      console.warn('[GHN] calculateFee response non-200:', data);
    } catch (err) {
      console.error('[GHN] calculateFee error:', err.message);
    }

    return {
      success: false,
      total: 30000,
      service_fee: 30000,
      insurance_fee: 0
    };
  }

  async getLeadTime(toDistrictId, toWardCode) {
    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/leadtime`, {
        method: 'POST',
        headers: {
          Token: this.token,
          ShopId: String(this.shopId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_district_id: Number(this.fromDistrictId),
          from_ward_code: String(this.fromWardCode),
          to_district_id: Number(toDistrictId),
          to_ward_code: String(toWardCode),
          service_id: 53320
        })
      });

      const data = await response.json();
      if (data && data.code === 200 && data.data && data.data.leadtime) {
        const d = new Date(data.data.leadtime * 1000);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    } catch (err) {
      console.error('[GHN] getLeadTime error:', err.message);
    }

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    return `${String(future.getDate()).padStart(2, '0')}/${String(future.getMonth() + 1).padStart(2, '0')}/${future.getFullYear()}`;
  }

  async createShippingOrder(order, extraParams = {}) {
    try {
      const items = Array.isArray(order.items) ? order.items : [];
      let totalWeight = 0;
      const ghnItems = items.map((item, idx) => {
        const itemWeight = Math.max(50, Math.round(Number(item.weight) || 250));
        const qty = Number(item.quantity) || 1;
        totalWeight += itemWeight * qty;
        return {
          name: `${item.name || 'Sản phẩm'} ${item.variantName ? '(' + item.variantName + ')' : ''}`.trim(),
          code: String(item.productId || `PROD-${idx + 1}`),
          quantity: qty,
          price: Number(item.price) || 0,
          weight: itemWeight
        };
      });

      const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
      const toDistrictId = Number(extraParams.districtId || order.districtId || this.fromDistrictId);
      const toWardCode = String(extraParams.wardCode || order.wardCode || this.fromWardCode);

      const isPaid = order.paymentStatus === 'paid' || ['momo', 'sepay', 'banking'].includes(order.paymentMethod);
      const codAmount = isPaid ? 0 : Number(order.totalAmount || 0);

      const finalWeight = Math.max(100, Math.round(Number(extraParams.weight) || totalWeight || 300));
      const finalLength = Math.max(10, Math.round(Number(extraParams.length) || 25));
      const finalWidth = Math.max(10, Math.round(Number(extraParams.width) || 20));
      const finalHeight = Math.max(5, Math.round(Number(extraParams.height) || 10));

      const payload = {
        payment_type_id: 1,
        note: `Đơn hàng #${order.id} - NovaShop`,
        required_note: 'CHOXEMHANGKHONGTHU',
        client_order_code: String(order.id),
        from_name: this.fromName,
        from_phone: this.fromPhone,
        from_address: this.fromAddress,
        from_ward_code: String(this.fromWardCode),
        from_district_id: Number(this.fromDistrictId),
        return_phone: this.returnPhone,
        return_address: this.returnAddress,
        return_district_id: Number(this.fromDistrictId),
        return_ward_code: String(this.fromWardCode),
        to_name: String(order.customerName || 'Khách hàng'),
        to_phone: cleanPhone || '0987654321',
        to_address: String(order.shippingAddress || 'Địa chỉ giao hàng'),
        to_ward_code: toWardCode,
        to_district_id: toDistrictId,
        cod_amount: Math.round(codAmount),
        content: `Đơn hàng NovaShop #${order.id}`,
        weight: finalWeight,
        length: finalLength,
        width: finalWidth,
        height: finalHeight,
        insurance_value: Math.min(5000000, Number(order.totalAmount) || 0),
        service_type_id: 2,
        items: ghnItems.length > 0 ? ghnItems : [
          {
            name: 'Đơn hàng NovaShop',
            code: 'DEFAULT-SKU',
            quantity: 1,
            price: Number(order.totalAmount) || 100000,
            weight: finalWeight
          }
        ]
      };

      const response = await fetch(`${this.apiUrl}/v2/shipping-order/create`, {
        method: 'POST',
        headers: {
          Token: this.token,
          ShopId: String(this.shopId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data && data.code === 200 && data.data && data.data.order_code) {
        return {
          success: true,
          order_code: data.data.order_code,
          expected_delivery_time: data.data.expected_delivery_time || null,
          total_fee: Number(data.data.total_fee || 0),
          tracking_url: `${this.trackingUrl}${data.data.order_code}`,
          status: 'ready_to_pick'
        };
      }

      console.error('[GHN] createShippingOrder failed:', data);
      const errorMsg = data.code_message_value || data.message || data.code_message || 'Lỗi từ hệ thống GHN';
      return {
        success: false,
        message: errorMsg,
        raw_error: data
      };
    } catch (err) {
      console.error('[GHN] createShippingOrder exception:', err.message);
      return {
        success: false,
        message: `Lỗi kết nối tới hệ thống GHN: ${err.message}`
      };
    }
  }

  async getOrderDetail(orderCode) {
    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/detail`, {
        method: 'POST',
        headers: {
          Token: this.token,
          ShopId: String(this.shopId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_code: String(orderCode) })
      });
      const data = await response.json();
      if (data && data.code === 200 && data.data) {
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || 'Không thể tra cứu đơn từ GHN' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async cancelOrder(orderCode) {
    try {
      const response = await fetch(`${this.apiUrl}/v2/switch-status/cancel`, {
        method: 'POST',
        headers: {
          Token: this.token,
          ShopId: String(this.shopId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_codes: [orderCode] })
      });
      const data = await response.json();
      if (data && data.code === 200) {
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || 'Không thể hủy đơn trên GHN' };
    } catch (err) {
      console.error('[GHN] cancelOrder exception:', err.message);
      return { success: false, message: err.message };
    }
  }
}

module.exports = new GhnService();
