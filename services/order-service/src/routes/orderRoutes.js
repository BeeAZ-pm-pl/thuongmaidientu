const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/ghn/provinces', orderController.getGhnProvinces);
router.get('/ghn/districts/:provinceId', orderController.getGhnDistricts);
router.get('/ghn/wards/:districtId', orderController.getGhnWards);
router.get('/ghn/lookup-ward', orderController.lookupGhnWard);
router.post('/ghn/calculate-fee', orderController.calculateGhnFee);

router.post('/payment/momo/ipn', orderController.handleMomoIpn);
router.get('/payment/momo/callback', orderController.handleMomoCallback);

router.post('/payment/sepay/webhook', orderController.handleSepayWebhook);

router.get('/stats', orderController.getStats);
router.get('/vouchers', orderController.getVouchers);
router.get('/vouchers/all', orderController.getAllVouchersAdmin);
router.post('/vouchers', orderController.createVoucher);
router.put('/vouchers/:code', orderController.updateVoucher);
router.delete('/vouchers/:code', orderController.deleteVoucher);
router.post('/vouchers/apply', orderController.applyVoucher);
router.get('/my-orders', orderController.getMyOrders);
router.get('/user/:userId', orderController.getMyOrders);

router.post('/:id/momo/create', orderController.createMomoPayment);
router.post('/:id/momo/simulate-success', orderController.simulateMomoSuccess);
router.get('/:id/sepay/info', orderController.getSepayInfo);
router.get('/:id/sepay/check', orderController.checkSepayPayment);
router.post('/:id/sepay/confirm', orderController.confirmSepayPayment);
router.post('/:id/sepay/simulate-success', orderController.simulateSepaySuccess);
router.post('/:id/ghn/create', orderController.createGhnOrder);
router.post('/:id/ghn/cancel', orderController.cancelGhnOrder);
router.post('/:id/ghn/sync', orderController.syncGhnOrder);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
