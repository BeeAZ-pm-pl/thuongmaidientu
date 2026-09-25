const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.getAllNotifications);
router.post('/events', notificationController.receiveEvent);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
