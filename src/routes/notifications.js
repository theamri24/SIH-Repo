const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// User notification routes
router.get('/', validatePagination, notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', validateObjectId, notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', validateObjectId, notificationController.deleteNotification);

// Admin only routes
router.post('/system-announcement', authorizeAdmin, notificationController.sendSystemAnnouncement);
router.get('/stats', authorizeAdmin, notificationController.getNotificationStats);

module.exports = router;




