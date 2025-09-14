const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticateToken, authorizeAdmin, authorizeResourceAccess } = require('../middleware/auth');
const { validateObjectId, validatePagination, validateTimetableQuery, validateTimetable } = require('../middleware/validation');
const { timetableLimiter } = require('../middleware/security');

// All routes require authentication
router.use(authenticateToken);

// AI Timetable Generation (rate limited)
router.post('/generate', timetableLimiter, timetableController.generateTimetable);

// Get timetables
router.get('/', authorizeAdmin, validatePagination, validateTimetableQuery, timetableController.getAllTimetables);
router.get('/student/:id', validateObjectId, authorizeResourceAccess('student'), validateTimetableQuery, timetableController.getStudentTimetable);
router.get('/teacher/:id', validateObjectId, authorizeResourceAccess('teacher'), validateTimetableQuery, timetableController.getTeacherTimetable);

// CRUD operations (Admin only)
router.post('/', authorizeAdmin, validateTimetable, timetableController.createTimetableSlot);
router.put('/:id', authorizeAdmin, validateObjectId, timetableController.updateTimetableSlot);
router.delete('/:id', authorizeAdmin, validateObjectId, timetableController.deleteTimetableSlot);

module.exports = router;

