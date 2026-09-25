const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');

const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ họ tên, email và mật khẩu' });
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Tài khoản hoặc email đã tồn tại' });
    }

    const newUser = await userModel.create({
      name,
      email,
      password,
      role: 'customer',
      phone: phone || '',
      address: address || ''
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          address: newUser.address
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const emailInput = req.body.email || req.body.username;
    const { password } = req.body;

    if (!emailInput || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu' });
    }

    const user = await userModel.findByEmail(emailInput.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
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
          role: user.role,
          phone: user.phone,
          address: user.address
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

const adminLogin = async (req, res) => {
  try {
    const emailInput = req.body.email || req.body.username;
    const { password } = req.body;

    if (!emailInput || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu quản trị' });
    }

    const user = await userModel.findByEmail(emailInput.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản quản trị hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tài khoản quản trị hoặc mật khẩu không chính xác' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Từ chối truy cập: Tài khoản này không có quyền quản trị viên'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      message: 'Xác thực quyền quản trị viên thành công',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address
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
    const user = await userModel.findById(req.user.id);
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
    const users = await userModel.getAllUsers();
    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  verifyAdmin,
  getMe,
  getAllUsers
};
