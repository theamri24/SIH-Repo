const db = require('../config/database');
const redis = require('../config/redis');

class UserController {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search, isActive } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = {};
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get users with pagination
      const [users, total] = await Promise.all([
        db.getClient().user.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            student: true,
            teacher: true,
            admin: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        db.getClient().user.count({ where })
      ]);

      // Remove passwords from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json({
        success: true,
        data: {
          users: sanitizedUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await db.getClient().user.findUnique({
        where: { id },
        include: {
          student: true,
          teacher: true,
          admin: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: { user: userWithoutPassword }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update user (Admin only)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, isActive, role } = req.body;

      const updateData = {
        firstName,
        lastName,
        isActive,
        updatedAt: new Date()
      };

      // Only allow role change for super admins
      if (role && req.user.admin?.level === 'SUPER_ADMIN') {
        updateData.role = role;
      }

      const updatedUser = await db.getClient().user.update({
        where: { id },
        data: updateData,
        include: {
          student: true,
          teacher: true,
          admin: true
        }
      });

      // Update cache
      await redis.set(`user:${id}`, {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      }, 3600);

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: userWithoutPassword }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete user (Admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Check if user exists
      const user = await db.getClient().user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Soft delete by deactivating
      await db.getClient().user.update({
        where: { id },
        data: { isActive: false }
      });

      // Clear cache
      await redis.del(`user:${id}`);

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all students
  async getAllStudents(req, res) {
    try {
      const { page = 1, limit = 10, year, semester, department, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = {
        user: { isActive: true }
      };
      if (year) where.year = parseInt(year);
      if (semester) where.semester = parseInt(semester);
      if (department) where.department = { contains: department, mode: 'insensitive' };
      if (search) {
        where.OR = [
          { studentId: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // Get students with pagination
      const [students, total] = await Promise.all([
        db.getClient().student.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        db.getClient().student.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          students,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all teachers
  async getAllTeachers(req, res) {
    try {
      const { page = 1, limit = 10, department, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = {
        user: { isActive: true }
      };
      if (department) where.department = { contains: department, mode: 'insensitive' };
      if (search) {
        where.OR = [
          { teacherId: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // Get teachers with pagination
      const [teachers, total] = await Promise.all([
        db.getClient().teacher.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true
              }
            },
            courses: {
              select: {
                id: true,
                courseName: true,
                courseCode: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        db.getClient().teacher.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          teachers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Get all teachers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get teachers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get student by ID
  async getStudentById(req, res) {
    try {
      const { id } = req.params;

      const student = await db.getClient().student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true
            }
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  courseName: true,
                  courseCode: true,
                  creditHours: true
                }
              }
            }
          },
          timetables: {
            include: {
              course: {
                select: {
                  courseName: true,
                  courseCode: true
                }
              },
              teacher: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              room: {
                select: {
                  roomName: true,
                  roomType: true
                }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      res.json({
        success: true,
        data: { student }
      });
    } catch (error) {
      console.error('Get student by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get teacher by ID
  async getTeacherById(req, res) {
    try {
      const { id } = req.params;

      const teacher = await db.getClient().teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true
            }
          },
          courses: {
            include: {
              enrollments: {
                select: {
                  id: true,
                  status: true
                }
              }
            }
          },
          timetables: {
            include: {
              course: {
                select: {
                  courseName: true,
                  courseCode: true
                }
              },
              room: {
                select: {
                  roomName: true,
                  roomType: true
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      res.json({
        success: true,
        data: { teacher }
      });
    } catch (error) {
      console.error('Get teacher by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get teacher',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update student
  async updateStudent(req, res) {
    try {
      const { id } = req.params;
      const { year, semester, department, specialization, preferences } = req.body;

      const updatedStudent = await db.getClient().student.update({
        where: { id },
        data: {
          year,
          semester,
          department,
          specialization,
          preferences: preferences || {}
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Student updated successfully',
        data: { student: updatedStudent }
      });
    } catch (error) {
      console.error('Update student error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update student',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update teacher
  async updateTeacher(req, res) {
    try {
      const { id } = req.params;
      const { department, designation, maxWorkload, availability, preferences } = req.body;

      const updatedTeacher = await db.getClient().teacher.update({
        where: { id },
        data: {
          department,
          designation,
          maxWorkload,
          availability: availability || {},
          preferences: preferences || {}
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: { teacher: updatedTeacher }
      });
    } catch (error) {
      console.error('Update teacher error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update teacher',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new UserController();

