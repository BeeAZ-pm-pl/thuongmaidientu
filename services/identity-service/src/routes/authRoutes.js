const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/health', authController.healthCheck);

// Cổng khách hàng
router.post('/register', authController.register);
router.post('/register-send-otp', authController.registerSendOtp);
router.post('/register-verify-otp', authController.registerVerifyOtp);
router.post('/register-resend-otp', authController.registerResendOtp);
router.post('/login', authController.login);

// Cổng quản trị viên
router.post('/admin/login', authController.adminLogin);
router.get('/verify-admin', authenticateToken, authController.verifyAdmin);

// Người dùng & Quản lý
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.get('/users', authenticateToken, requireRole('admin'), authController.getAllUsers);

module.exports = router;
