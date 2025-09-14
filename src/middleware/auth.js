const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await db.getClient().user.findUnique({
      where: { id: decoded.userId },
      include: {
        student: true,
        teacher: true,
        admin: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

const authorizeStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Student access required'
    });
  }
  next();
};

const authorizeTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      message: 'Teacher access required'
    });
  }
  next();
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const authorizeResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id || req.params.studentId || req.params.teacherId;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      // Admin can access all resources
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Check if user owns the resource
      let hasAccess = false;

      switch (resourceType) {
        case 'student':
          if (req.user.role === 'STUDENT') {
            const student = await db.getClient().student.findFirst({
              where: { userId, id: resourceId }
            });
            hasAccess = !!student;
          }
          break;

        case 'teacher':
          if (req.user.role === 'TEACHER') {
            const teacher = await db.getClient().teacher.findFirst({
              where: { userId, id: resourceId }
            });
            hasAccess = !!teacher;
          }
          break;

        case 'timetable':
          if (req.user.role === 'STUDENT') {
            const timetable = await db.getClient().timetable.findFirst({
              where: { studentId: resourceId }
            });
            hasAccess = !!timetable;
          } else if (req.user.role === 'TEACHER') {
            const timetable = await db.getClient().timetable.findFirst({
              where: { teacherId: resourceId }
            });
            hasAccess = !!timetable;
          }
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Resource access authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeStudent,
  authorizeTeacher,
  authorizeAdmin,
  authorizeResourceAccess
};

