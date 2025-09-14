const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// All routes require authentication and admin access
router.use(authenticateToken);
router.use(authorizeAdmin);

// Analytics endpoints
router.get('/room-utilization', analyticsController.getRoomUtilization);
router.get('/teacher-workload', analyticsController.getTeacherWorkload);
router.get('/student-free-hours', analyticsController.getStudentFreeHours);
router.get('/dashboard', analyticsController.getDashboardAnalytics);

module.exports = router;


