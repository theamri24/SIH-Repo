const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Role must be STUDENT, TEACHER, or ADMIN'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Student validation rules
const validateStudentRegistration = [
  body('studentId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Student ID must be between 3 and 20 characters'),
  body('year')
    .isInt({ min: 1, max: 4 })
    .withMessage('Year must be between 1 and 4'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  handleValidationErrors
];

// Teacher validation rules
const validateTeacherRegistration = [
  body('teacherId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Teacher ID must be between 3 and 20 characters'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('designation')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters'),
  body('maxWorkload')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Max workload must be between 1 and 60 hours'),
  handleValidationErrors
];

// Course validation rules
const validateCourse = [
  body('courseId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Course ID must be between 3 and 20 characters'),
  body('courseName')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Course name must be between 3 and 200 characters'),
  body('courseCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Course code must be between 3 and 20 characters'),
  body('creditHours')
    .isInt({ min: 1, max: 6 })
    .withMessage('Credit hours must be between 1 and 6'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('multidisciplinaryTags')
    .isArray({ min: 1 })
    .withMessage('At least one multidisciplinary tag is required'),
  body('multidisciplinaryTags.*')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each tag must be between 2 and 50 characters'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max students must be a positive integer'),
  body('minStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min students must be a positive integer'),
  handleValidationErrors
];

// Room validation rules
const validateRoom = [
  body('roomId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Room ID must be between 3 and 20 characters'),
  body('roomName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be between 3 and 100 characters'),
  body('roomType')
    .isIn(['CLASSROOM', 'LABORATORY', 'SEMINAR_HALL', 'AUDITORIUM', 'COMPUTER_LAB', 'SCIENCE_LAB', 'LIBRARY'])
    .withMessage('Invalid room type'),
  body('capacity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Capacity must be between 1 and 1000'),
  body('floor')
    .isInt({ min: 0, max: 50 })
    .withMessage('Floor must be between 0 and 50'),
  body('building')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Building must be between 2 and 100 characters'),
  handleValidationErrors
];

// Timetable validation rules
const validateTimetable = [
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher ID is required'),
  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required'),
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required'),
  body('dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('academicYear')
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Academic year must be between 4 and 10 characters'),
  handleValidationErrors
];

// Parameter validation
const validateObjectId = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('ID parameter is required'),
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateTimetableQuery = [
  query('semester')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  query('academicYear')
    .optional()
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Academic year must be between 4 and 10 characters'),
  query('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 and 6'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateStudentRegistration,
  validateTeacherRegistration,
  validateCourse,
  validateRoom,
  validateTimetable,
  validateObjectId,
  validatePagination,
  validateTimetableQuery
};

