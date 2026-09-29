const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/stats', orderController.getStats);
router.get('/vouchers', orderController.getVouchers);
router.post('/vouchers/apply', orderController.applyVoucher);
router.get('/my-orders', orderController.getMyOrders);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
