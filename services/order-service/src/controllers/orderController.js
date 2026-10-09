const orderModel = require('../models/orderModel');
const ghnService = require('../services/ghnService');
const momoService = require('../services/momoService');
const sepayService = require('../services/sepayService');
const config = require('../config');

const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await orderModel.findAll({ status });
    return res.json({ success: true, total: orders.length, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đơn hàng', error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tìm đơn hàng', error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId || (req.user && req.user.id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Yêu cầu định danh người dùng' });
    }
    const orders = await orderModel.findByUserId(userId);
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy đơn hàng của người dùng', error: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
      userId,
      voucherCode,
      shippingFee,
      provinceId,
      districtId,
      wardCode
    } = req.body;

    const finalUserId = userId || (req.user && req.user.id);
    if (!finalUserId || finalUserId === 'guest') {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiến hành đặt hàng'
      });
    }

    if (!customerName || !customerPhone || !shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin người nhận và danh sách sản phẩm'
      });
    }

    const order = await orderModel.create({
      userId: finalUserId,
      customerName,
      customerPhone,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      items,
      voucherCode,
      shippingFee: Number(shippingFee) || 0,
      provinceId: provinceId ? Number(provinceId) : null,
      districtId: districtId ? Number(districtId) : null,
      wardCode: wardCode ? String(wardCode) : null
    });

    let momoPayment = null;
    let sepayPayment = null;

    if (order.paymentMethod === 'momo') {
      try {
        const momoRes = await momoService.createPayment(order);
        if (momoRes && momoRes.payUrl) {
          momoPayment = momoRes;
        }
      } catch (mErr) {
        console.warn('[MoMo] Pre-create payment on checkout warning:', mErr.message);
      }
    } else if (order.paymentMethod === 'sepay') {
      try {
        sepayPayment = sepayService.generatePaymentInfo(order);
      } catch (sErr) {
        console.warn('[SePay] Pre-generate payment info warning:', sErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: order,
      momoPayment,
      sepayPayment
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo đơn hàng'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái mới' });
    }

    const updated = await orderModel.updateStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để cập nhật' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: updated
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const updated = await orderModel.updateOrder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để cập nhật' });
    }
    return res.json({
      success: true,
      message: 'Cập nhật đơn hàng thành công',
      data: updated
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getVouchers = async (req, res) => {
  try {
    const vouchers = await orderModel.getAvailableVouchers();
    return res.json({ success: true, data: vouchers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách voucher', error: error.message });
  }
};

const getAllVouchersAdmin = async (req, res) => {
  try {
    const vouchers = await orderModel.getAllVouchersAdmin();
    return res.json({ success: true, total: vouchers.length, data: vouchers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách voucher quản trị', error: error.message });
  }
};

const createVoucher = async (req, res) => {
  try {
    const { code, name, discountType, discountValue, minOrderValue, maxDiscount, description, usageLimit, isActive, expiresAt } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã và tên voucher' });
    }
    const voucher = await orderModel.createVoucher({
      code,
      name,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      description,
      usageLimit,
      isActive,
      expiresAt
    });
    return res.status(201).json({ success: true, message: 'Tạo mã voucher thành công', data: voucher });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await orderModel.updateVoucher(code, req.body);
    return res.json({ success: true, message: 'Cập nhật voucher thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { code } = req.params;
    await orderModel.deleteVoucher(code);
    return res.json({ success: true, message: 'Đã xóa voucher thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const applyVoucher = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const result = await orderModel.validateVoucher(code, orderTotal);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.json({ success: true, message: 'Áp dụng mã giảm giá thành công', data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await orderModel.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu thống kê', error: error.message });
  }
};

const getGhnProvinces = async (req, res) => {
  try {
    const provinces = await ghnService.getProvinces();
    return res.json({ success: true, data: provinces });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tỉnh thành GHN: ' + error.message });
  }
};

const getGhnDistricts = async (req, res) => {
  try {
    const districts = await ghnService.getDistricts(req.params.provinceId);
    return res.json({ success: true, data: districts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách quận huyện GHN: ' + error.message });
  }
};

const getGhnWards = async (req, res) => {
  try {
    const wards = await ghnService.getWards(req.params.districtId);
    return res.json({ success: true, data: wards });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phường xã GHN: ' + error.message });
  }
};

const lookupGhnWard = async (req, res) => {
  try {
    const { provinceId, keyword } = req.query;
    if (!provinceId || !keyword) {
      return res.status(400).json({ success: false, message: 'Thiếu provinceId hoặc keyword' });
    }
    const result = await ghnService.lookupWard(provinceId, keyword);
    if (result) {
      return res.json({ success: true, data: result });
    }
    return res.json({ success: false, message: 'Không tìm thấy đơn vị hành chính phù hợp' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tra cứu: ' + error.message });
  }
};

const calculateGhnFee = async (req, res) => {
  try {
    const { district_id, ward_code, weight, insurance_value } = req.body;
    if (!district_id || !ward_code) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn Quận/Huyện và Phường/Xã để tính phí giao hàng.'
      });
    }

    const feeResult = await ghnService.calculateFee({
      toDistrictId: district_id,
      toWardCode: ward_code,
      weight: weight || 300,
      insuranceValue: insurance_value || 0
    });

    const leadtime = await ghnService.getLeadTime(district_id, ward_code);

    return res.json({
      success: true,
      fee: feeResult.total,
      service_fee: feeResult.service_fee,
      insurance_fee: feeResult.insurance_fee,
      leadtime,
      formatted_fee: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(feeResult.total)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tính cước GHN: ' + error.message });
  }
};

const createGhnOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const { weight, length, width, height, required_note, note } = req.body || {};
    const extraParams = {
      weight: weight ? Number(weight) : undefined,
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      required_note,
      note
    };

    const ghnRes = await ghnService.createShippingOrder(order, extraParams);
    if (ghnRes.success && ghnRes.order_code) {
      const updated = await orderModel.updateGhnShipping(order.id, {
        ghnOrderCode: ghnRes.order_code,
        ghnStatus: ghnRes.status || 'ready_to_pick',
        ghnExpectedDelivery: ghnRes.expected_delivery_time || null
      });
      return res.json({
        success: true,
        message: 'Tạo vận đơn GHN thành công',
        data: updated,
        ghn: ghnRes
      });
    }

    return res.status(400).json({
      success: false,
      message: ghnRes.message || 'Không thể tạo vận đơn GHN',
      error: ghnRes.raw_error
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tạo vận đơn GHN: ' + error.message });
  }
};

const syncGhnOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order || !order.ghnOrderCode) {
      return res.status(400).json({ success: false, message: 'Đơn hàng chưa có mã vận đơn GHN để đồng bộ' });
    }

    const detailRes = await ghnService.getOrderDetail(order.ghnOrderCode);
    if (detailRes.success && detailRes.data) {
      const remoteStatus = detailRes.data.status || order.ghnStatus;
      const expectedDelivery = detailRes.data.leadtime || detailRes.data.expected_delivery_time || order.ghnExpectedDelivery;
      const updated = await orderModel.updateGhnShipping(order.id, {
        ghnStatus: remoteStatus,
        ghnExpectedDelivery: expectedDelivery ? new Date(expectedDelivery * 1000 || expectedDelivery) : null
      });
      return res.json({
        success: true,
        message: `Đã đồng bộ trạng thái mới nhất từ GHN: ${remoteStatus}`,
        data: updated,
        ghnData: detailRes.data
      });
    }

    return res.status(400).json({
      success: false,
      message: detailRes.message || 'Không thể đồng bộ thông tin từ GHN'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi đồng bộ vận đơn GHN: ' + error.message });
  }
};

const cancelGhnOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order || !order.ghnOrderCode) {
      return res.status(400).json({ success: false, message: 'Đơn hàng chưa có mã vận đơn GHN' });
    }

    const cancelRes = await ghnService.cancelOrder(order.ghnOrderCode);
    if (cancelRes.success) {
      await orderModel.updateGhnShipping(order.id, { ghnStatus: 'cancel' });
      return res.json({ success: true, message: 'Đã gửi yêu cầu hủy vận đơn tới GHN' });
    }

    return res.status(400).json({
      success: false,
      message: cancelRes.message || 'Không thể hủy vận đơn trên GHN'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hủy vận đơn GHN: ' + error.message });
  }
};

const createMomoPayment = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const requestType = req.body.requestType || config.momo.requestType || 'payWithATM';
    const momoRes = await momoService.createPayment(order, requestType);

    if (momoRes.payUrl) {
      return res.json({ success: true, data: momoRes });
    }

    return res.status(400).json({
      success: false,
      message: momoRes.message || 'Không thể khởi tạo thanh toán MoMo',
      data: momoRes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tạo giao dịch MoMo: ' + error.message });
  }
};

const handleMomoIpn = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[MoMo IPN] Received:', payload);
    const isValid = momoService.isValidResponse(payload);
    if (!isValid) {
      console.warn('[MoMo IPN] Invalid signature!');
      return res.status(400).json({ message: 'Invalid signature', status: 'error' });
    }

    const orderId = momoService.extractOrderId(payload);
    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId in extraData or orderId', status: 'error' });
    }

    const isSuccess = momoService.isSuccessful(payload);
    if (isSuccess) {
      await orderModel.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        transactionId: payload.transId || payload.orderId,
        paymentMethod: 'momo'
      });
      console.log(`[MoMo IPN] Order #${orderId} marked as PAID.`);
    } else {
      console.log(`[MoMo IPN] Order #${orderId} payment failed with code ${payload.resultCode}: ${payload.message}`);
    }

    return res.status(200).json({ message: 'Received and processed', status: 'success' });
  } catch (error) {
    console.error('[MoMo IPN] Exception:', error.message);
    return res.status(500).json({ message: error.message, status: 'error' });
  }
};

const handleMomoCallback = async (req, res) => {
  try {
    const payload = req.query;
    console.log('[MoMo Callback] Query received:', payload);
    const orderId = momoService.extractOrderId(payload);
    const isSuccess = momoService.isSuccessful(payload);

    if (orderId && isSuccess) {
      await orderModel.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        transactionId: payload.transId || payload.orderId,
        paymentMethod: 'momo'
      });
    }

    const redirectUrl = `/orders?momoResult=${payload.resultCode || 0}&orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent(payload.message || '')}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('[MoMo Callback] Exception:', error.message);
    return res.redirect('/orders?momoResult=99&message=' + encodeURIComponent(error.message));
  }
};

const getSepayInfo = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    const info = sepayService.generatePaymentInfo(order);
    return res.json({ success: true, data: info });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tạo thông tin SePay: ' + error.message });
  }
};

const handleSepayWebhook = async (req, res) => {
  try {
    const isValidToken = sepayService.verifyWebhookToken(req);
    if (!isValidToken) {
      console.warn('[SePay Webhook] Unauthorized token header:', req.headers['authorization']);
      return res.status(401).json({ success: false, message: 'Unauthorized webhook token' });
    }

    const payload = req.body || {};
    console.log('[SePay Webhook] Received:', payload);
    const content = payload.content || payload.transactionContent || payload.description || '';
    let orderId = sepayService.extractOrderId(content);

    let order = null;
    if (orderId) {
      order = await orderModel.findById(orderId);
    }

    // Fallback 1: Tìm theo chuỗi mã đơn bỏ ký tự đặc biệt
    if (!order && content) {
      const cleanContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const db = await orderModel.initDb();
      const [recentOrders] = await db.query(
        "SELECT id FROM orders WHERE paymentStatus != 'paid' AND createdAt >= NOW() - INTERVAL 3 DAY"
      );
      for (const ro of recentOrders) {
        const cleanOrderId = ro.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanContent.includes(cleanOrderId)) {
          order = await orderModel.findById(ro.id);
          orderId = ro.id;
          break;
        }
      }
    }

    // Fallback 2: Khớp theo số tiền chuyển khoản với đơn hàng sepay đang chờ thanh toán gần nhất
    if (!order) {
      const transferAmount = Number(payload.transferAmount || payload.amountIn || payload.accumulated || 0);
      if (transferAmount > 0) {
        const db = await orderModel.initDb();
        const [amountOrders] = await db.query(
          "SELECT id FROM orders WHERE paymentStatus != 'paid' AND paymentMethod = 'sepay' AND totalAmount = ? AND createdAt >= NOW() - INTERVAL 1 DAY ORDER BY createdAt DESC LIMIT 1",
          [transferAmount]
        );
        if (amountOrders.length > 0) {
          order = await orderModel.findById(amountOrders[0].id);
          orderId = order.id;
        }
      }
    }

    if (!order) {
      return res.status(200).json({ success: true, message: 'Webhook received but no matching order found' });
    }

    const transferAmount = Number(payload.transferAmount || payload.amountIn || payload.accumulated || 0);
    if (transferAmount > 0 && transferAmount < Number(order.totalAmount)) {
      console.warn(`[SePay Webhook] Transfer amount ${transferAmount} is less than order total ${order.totalAmount}`);
      return res.status(200).json({ success: true, message: 'Amount is less than order total' });
    }

    await orderModel.updatePaymentStatus(order.id, {
      paymentStatus: 'paid',
      transactionId: String(payload.referenceCode || payload.id || `SEPAY_${Date.now()}`),
      paymentMethod: 'sepay'
    });

    console.log(`[SePay Webhook] Order #${order.id} marked as PAID via SePay!`);
    return res.json({ success: true, message: `Order ${order.id} paid successfully` });
  } catch (error) {
    console.error('[SePay Webhook] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const checkSepayPayment = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        isPaid: true,
        message: 'Đơn hàng đã được thanh toán thành công',
        data: order
      });
    }

    // Kiểm tra trực tiếp qua SePay API bằng API Key
    const matchedTrans = await sepayService.checkTransactionsApi(order);
    if (matchedTrans) {
      const updated = await orderModel.updatePaymentStatus(order.id, {
        paymentStatus: 'paid',
        transactionId: matchedTrans.id,
        paymentMethod: 'sepay'
      });
      console.log(`[SePay Check] Found matching transaction ${matchedTrans.id} for order #${order.id}!`);
      return res.json({
        success: true,
        isPaid: true,
        message: 'SePay đã xác nhận thanh toán thành công!',
        data: updated
      });
    }

    return res.json({
      success: true,
      isPaid: false,
      message: 'Chưa tìm thấy giao dịch ngân hàng khớp với nội dung chuyển khoản'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const confirmSepayPayment = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        isPaid: true,
        message: 'Đơn hàng này đã được xác nhận thanh toán thành công!',
        data: order
      });
    }

    // 1. Kiểm tra qua SePay API nếu có giao dịch thật
    const matchedTrans = await sepayService.checkTransactionsApi(order);
    const transId = matchedTrans ? matchedTrans.id : `SEPAY_USER_CONFIRMED_${Date.now()}`;

    const updated = await orderModel.updatePaymentStatus(order.id, {
      paymentStatus: 'paid',
      transactionId: transId,
      paymentMethod: 'sepay'
    });

    console.log(`[SePay Confirm] Order #${order.id} marked as PAID via User Confirmation (TransID: ${transId})`);
    return res.json({
      success: true,
      isPaid: true,
      message: matchedTrans
        ? 'SePay và ngân hàng đã xác nhận giao dịch thành công!'
        : 'Đã xác nhận chuyển khoản thành công! Đơn hàng đang được đóng gói giao vận.',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const simulateSepaySuccess = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const updated = await orderModel.updatePaymentStatus(order.id, {
      paymentStatus: 'paid',
      transactionId: `SEPAY_SIM_${Date.now()}`,
      paymentMethod: 'sepay'
    });

    return res.json({
      success: true,
      message: `Mô phỏng thanh toán SePay thành công cho đơn #${order.id}!`,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const simulateMomoSuccess = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const updated = await orderModel.updatePaymentStatus(order.id, {
      paymentStatus: 'paid',
      transactionId: `MOMO_SIM_${Date.now()}`,
      paymentMethod: 'momo'
    });

    return res.json({
      success: true,
      message: `Xác nhận thanh toán MoMo thành công cho đơn #${order.id}!`,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getMyOrders,
  createOrder,
  updateOrderStatus,
  updateOrder,
  getVouchers,
  getAllVouchersAdmin,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getStats,
  getGhnProvinces,
  getGhnDistricts,
  getGhnWards,
  lookupGhnWard,
  calculateGhnFee,
  createGhnOrder,
  cancelGhnOrder,
  syncGhnOrder,
  createMomoPayment,
  handleMomoIpn,
  handleMomoCallback,
  getSepayInfo,
  handleSepayWebhook,
  checkSepayPayment,
  confirmSepayPayment,
  simulateSepaySuccess,
  simulateMomoSuccess
};
