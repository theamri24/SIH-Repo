const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeAdmin, authorizeResourceAccess } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get('/', authorizeAdmin, validatePagination, userController.getAllUsers);
router.get('/students', authorizeAdmin, validatePagination, userController.getAllStudents);
router.get('/teachers', authorizeAdmin, validatePagination, userController.getAllTeachers);
router.put('/:id', authorizeAdmin, validateObjectId, userController.updateUser);
router.delete('/:id', authorizeAdmin, validateObjectId, userController.deleteUser);

// Student routes
router.get('/students/:id', validateObjectId, authorizeResourceAccess('student'), userController.getStudentById);
router.put('/students/:id', validateObjectId, authorizeResourceAccess('student'), userController.updateStudent);

// Teacher routes
router.get('/teachers/:id', validateObjectId, authorizeResourceAccess('teacher'), userController.getTeacherById);
router.put('/teachers/:id', validateObjectId, authorizeResourceAccess('teacher'), userController.updateTeacher);

// General user routes
router.get('/:id', validateObjectId, userController.getUserById);

module.exports = router;

