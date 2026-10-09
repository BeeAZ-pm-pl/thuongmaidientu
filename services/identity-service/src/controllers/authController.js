const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const customerModel = require('../models/customerModel');
const adminModel = require('../models/adminModel');
const otpModel = require('../models/otpModel');
const mailService = require('../services/mailService');
const { initDb } = require('../models/db');

// ----------------------------------------------------
// CỔNG KHÁCH HÀNG (Storefront) - Xác thực OTP Email & Đăng ký
// ----------------------------------------------------

/**
 * Bước 1: Gửi mã OTP xác thực đăng ký tài khoản qua Gmail
 */
const registerSendOtp = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ họ tên, email và mật khẩu' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Kiểm tra xem email đã tồn tại trong bảng customers chưa
    const existingCustomer = await customerModel.findByEmail(cleanEmail);
    if (existingCustomer) {
      return res.status(409).json({ success: false, message: 'Địa chỉ Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.' });
    }

    // 2. Tạo mã OTP ngẫu nhiên 6 chữ số (từ 100000 đến 999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Băm mật khẩu bảo mật
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Lưu OTP kèm payload tạm vào bảng customer_otps (hết hạn sau 5 phút)
    await otpModel.saveOtp({
      email: cleanEmail,
      otp: otpCode,
      payload: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : ''
      },
      expiresInMinutes: 5
    });

    // 5. Gửi email xác thực OTP qua SMTP Gmail
    try {
      await mailService.sendRegistrationOtp({
        toEmail: cleanEmail,
        customerName: name,
        otpCode
      });
    } catch (mailError) {
      console.error('[SMTP ERROR] Gửi mail OTP thất bại:', mailError.message);
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email OTP lúc này. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.',
        error: mailError.message
      });
    }

    return res.json({
      success: true,
      message: `Mã OTP xác thực gồm 6 chữ số đã được gửi đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư (cả mục Spam/Rác nếu không thấy).`,
      data: {
        email: cleanEmail,
        expiresIn: 300 // 5 phút
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] registerSendOtp:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

/**
 * Bước 2: Xác thực mã OTP và chính thức khởi tạo tài khoản Khách hàng
 */
const registerVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email và mã xác thực OTP 6 số' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    // Xác thực mã OTP từ database
    const payload = await otpModel.verifyOtp({ email: cleanEmail, otp: cleanOtp });
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP không chính xác hoặc đã hết hạn (sau 5 phút). Vui lòng kiểm tra lại hoặc yêu cầu gửi lại mã mới.'
      });
    }

    // Kiểm tra lại lần nữa xem email có bị trùng không
    const duplicate = await customerModel.findByEmail(cleanEmail);
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Tài khoản với email này đã tồn tại.' });
    }

    // Tạo bản ghi chính thức trong bảng `customers`
    const id = `usr_cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const db = await initDb();
    await db.query(
      'INSERT INTO customers (id, name, email, password, phone, address, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [id, payload.name, cleanEmail, payload.password, payload.phone || '', payload.address || '', 'customer']
    );

    // Ký JWT Token đăng nhập ngay cho khách hàng
    const token = jwt.sign(
      { id, email: cleanEmail, role: 'customer', name: payload.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      message: 'Xác thực email thành công! Chào mừng bạn gia nhập NovaShop.',
      data: {
        token,
        user: {
          id,
          name: payload.name,
          email: cleanEmail,
          role: 'customer',
          phone: payload.phone,
          address: payload.address
        }
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] registerVerifyOtp:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

/**
 * Gửi lại mã OTP cho email đang chờ xác thực
 */
const registerResendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email cần gửi lại mã' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await initDb();
    const [rows] = await db.query(
      'SELECT * FROM customer_otps WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1',
      [cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đăng ký đang chờ của email này. Vui lòng thực hiện đăng ký lại từ đầu.'
      });
    }

    const record = rows[0];
    let payload = record.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await otpModel.saveOtp({
      email: cleanEmail,
      otp: newOtp,
      payload,
      expiresInMinutes: 5
    });

    try {
      await mailService.sendRegistrationOtp({
        toEmail: cleanEmail,
        customerName: payload.name || 'Quý khách',
        otpCode: newOtp
      });
    } catch (mailError) {
      return res.status(500).json({ success: false, message: 'Không thể gửi lại email OTP: ' + mailError.message });
    }

    return res.json({
      success: true,
      message: `Đã gửi lại mã OTP mới đến ${cleanEmail}. Vui lòng kiểm tra hộp thư.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

/**
 * Route đăng ký trực tiếp (chuyển hướng sang quy trình OTP)
 */
const register = async (req, res) => {
  return registerSendOtp(req, res);
};

const login = async (req, res) => {
  try {
    const emailInput = req.body.email || req.body.username;
    const { password } = req.body;

    if (!emailInput || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu' });
    }

    // Chỉ truy vấn bảng `customers`
    const user = await customerModel.findByEmail(emailInput.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'customer', name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'customer',
          phone: user.phone,
          address: user.address
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

// ----------------------------------------------------
// CỔNG QUẢN TRỊ (Admin Portal) - Chỉ tương tác bảng `admins`
// ----------------------------------------------------
const adminLogin = async (req, res) => {
  try {
    const identifier = req.body.username || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu quản trị' });
    }

    // Chỉ truy vấn bảng `admins`
    const admin = await adminModel.findByUsernameOrEmail(identifier.trim());
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Tài khoản quản trị hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tài khoản quản trị hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, username: admin.username, role: 'admin', name: admin.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      message: 'Xác thực quyền quản trị viên thành công',
      data: {
        token,
        user: {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          email: admin.email,
          role: 'admin',
          phone: admin.phone
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const verifyAdmin = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Không đủ quyền hạn quản trị viên' });
  }

  return res.json({
    success: true,
    message: 'Quyền quản trị viên hợp lệ',
    data: req.user
  });
};

const getMe = async (req, res) => {
  try {
    let user = null;
    if (req.user.role === 'admin') {
      user = await adminModel.findById(req.user.id);
    } else {
      user = await customerModel.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const { password, ...safeUser } = user;
    return res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const customers = await customerModel.getAllCustomers();
    return res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    let updated = null;
    if (req.user.role === 'admin') {
      const db = await initDb();
      await db.query('UPDATE admins SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?', [name || null, phone || null, req.user.id]);
      updated = await adminModel.findById(req.user.id);
    } else {
      updated = await customerModel.updateProfile(req.user.id, { name, phone, address });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }
    const { password, ...safeUser } = updated;
    return res.json({ success: true, message: 'Cập nhật thông tin thành công', data: safeUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    let user = null;
    if (req.user.role === 'admin') {
      user = await adminModel.findById(req.user.id);
    } else {
      user = await customerModel.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    if (req.user.role === 'admin') {
      await adminModel.updatePassword(req.user.id, hashedNewPassword);
    } else {
      await customerModel.updatePassword(req.user.id, hashedNewPassword);
    }

    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const healthCheck = (req, res) => {
  res.json({ service: 'identity-service', status: 'healthy', timestamp: new Date() });
};

module.exports = {
  register,
  registerSendOtp,
  registerVerifyOtp,
  registerResendOtp,
  login,
  adminLogin,
  verifyAdmin,
  getMe,
  getAllUsers,
  updateProfile,
  changePassword,
  healthCheck
};
