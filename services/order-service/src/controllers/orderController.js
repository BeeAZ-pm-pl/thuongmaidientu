const orderModel = require('../models/orderModel');

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
    const userId = req.query.userId || (req.user && req.user.id);
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
    const { customerName, customerPhone, shippingAddress, items, paymentMethod, userId } = req.body;
    if (!customerName || !customerPhone || !shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin người nhận và danh sách sản phẩm'
      });
    }

    const order = await orderModel.create({
      userId: userId || 'guest',
      customerName,
      customerPhone,
      shippingAddress,
      paymentMethod,
      items
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: order
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

const getStats = async (req, res) => {
  try {
    const stats = await orderModel.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu thống kê', error: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getMyOrders,
  createOrder,
  updateOrderStatus,
  getStats
};
