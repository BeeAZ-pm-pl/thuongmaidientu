const notificationModel = require('../models/notificationModel');
const { processOrderEvent } = require('../consumers/orderConsumer');

const getAllNotifications = async (req, res) => {
  try {
    const notifications = await notificationModel.getAll();
    return res.json({ success: true, total: notifications.length, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo', error: error.message });
  }
};

const receiveEvent = async (req, res) => {
  try {
    const event = req.body;
    if (!event || !event.eventType) {
      return res.status(400).json({ success: false, message: 'Dữ liệu sự kiện không hợp lệ' });
    }
    await processOrderEvent(event);
    return res.json({ success: true, message: 'Đã nhận và xử lý sự kiện qua HTTP fallback' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xử lý sự kiện', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const updated = await notificationModel.markAsRead(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo', error: error.message });
  }
};

module.exports = {
  getAllNotifications,
  receiveEvent,
  markAsRead
};
