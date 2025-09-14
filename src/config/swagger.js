const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Powered Timetable Generation System API',
      version: '1.0.0',
      description: 'A comprehensive API for AI-powered timetable generation system aligned with NEP 2020 multidisciplinary education',
      contact: {
        name: 'AI Timetable Team',
        email: 'info@aitimetable.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.aitimetable.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            email: { type: 'string', format: 'email', example: 'john.doe@student.edu' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'], example: 'STUDENT' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            studentId: { type: 'string', example: 'STU001' },
            year: { type: 'integer', example: 2 },
            semester: { type: 'integer', example: 3 },
            department: { type: 'string', example: 'Computer Science' },
            specialization: { type: 'string', example: 'AI/ML' },
            preferences: { type: 'object' }
          }
        },
        Teacher: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            teacherId: { type: 'string', example: 'TCH001' },
            department: { type: 'string', example: 'Computer Science' },
            designation: { type: 'string', example: 'Professor' },
            maxWorkload: { type: 'integer', example: 40 },
            availability: { type: 'object' },
            preferences: { type: 'object' }
          }
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            courseId: { type: 'string', example: 'CS101' },
            courseName: { type: 'string', example: 'Introduction to Programming' },
            courseCode: { type: 'string', example: 'CS101' },
            creditHours: { type: 'integer', example: 3 },
            department: { type: 'string', example: 'Computer Science' },
            multidisciplinaryTags: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Programming', 'Logic', 'Problem Solving']
            },
            prerequisites: { 
              type: 'array', 
              items: { type: 'string' },
              example: []
            },
            maxStudents: { type: 'integer', example: 30 },
            minStudents: { type: 'integer', example: 5 }
          }
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            roomId: { type: 'string', example: 'R001' },
            roomName: { type: 'string', example: 'Computer Lab 1' },
            roomType: { 
              type: 'string', 
              enum: ['CLASSROOM', 'LABORATORY', 'SEMINAR_HALL', 'AUDITORIUM', 'COMPUTER_LAB', 'SCIENCE_LAB', 'LIBRARY'],
              example: 'COMPUTER_LAB'
            },
            capacity: { type: 'integer', example: 30 },
            floor: { type: 'integer', example: 1 },
            building: { type: 'string', example: 'Tech Building' },
            equipment: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Computers', 'Projector', 'Whiteboard']
            }
          }
        },
        Timetable: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            studentId: { type: 'string', example: 'cuid123' },
            teacherId: { type: 'string', example: 'cuid123' },
            courseId: { type: 'string', example: 'cuid123' },
            roomId: { type: 'string', example: 'cuid123' },
            dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, example: 1 },
            startTime: { type: 'string', format: 'time', example: '09:00' },
            endTime: { type: 'string', format: 'time', example: '10:30' },
            semester: { type: 'integer', example: 3 },
            academicYear: { type: 'string', example: '2024-25' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123' },
            userId: { type: 'string', example: 'cuid123' },
            title: { type: 'string', example: 'Timetable Updated' },
            message: { type: 'string', example: 'Your class has been moved to a different room' },
            type: { 
              type: 'string', 
              enum: ['TIMETABLE_UPDATE', 'CONFLICT_RESOLVED', 'ROOM_CHANGE', 'TEACHER_ABSENT', 'COURSE_CANCELLED', 'SYSTEM_ANNOUNCEMENT'],
              example: 'TIMETABLE_UPDATE'
            },
            isRead: { type: 'boolean', example: false },
            data: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: { 
              type: 'array', 
              items: { type: 'object' }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;




