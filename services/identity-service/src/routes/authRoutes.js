const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.get('/verify-admin', authenticateToken, authController.verifyAdmin);
router.get('/me', authenticateToken, authController.getMe);
router.get('/users', authenticateToken, requireRole('admin'), authController.getAllUsers);

module.exports = router;
