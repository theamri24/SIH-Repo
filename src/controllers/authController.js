const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const redis = require('../config/redis');

class AuthController {
  // Register a new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, role, ...additionalData } = req.body;

      // Check if user already exists
      const existingUser = await db.getClient().user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user with transaction
      const result = await db.getClient().$transaction(async (prisma) => {
        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role
          }
        });

        // Create role-specific profile
        if (role === 'STUDENT') {
          const { studentId, year, semester, department, specialization, preferences } = additionalData;
          await prisma.student.create({
            data: {
              studentId,
              year,
              semester,
              department,
              specialization,
              preferences: preferences || {},
              userId: user.id
            }
          });
        } else if (role === 'TEACHER') {
          const { teacherId, department, designation, maxWorkload, availability, preferences } = additionalData;
          await prisma.teacher.create({
            data: {
              teacherId,
              department,
              designation,
              maxWorkload: maxWorkload || 40,
              availability: availability || {},
              preferences: preferences || {},
              userId: user.id
            }
          });
        } else if (role === 'ADMIN') {
          const { adminId, level } = additionalData;
          await prisma.admin.create({
            data: {
              adminId,
              level: level || 'ADMIN',
              userId: user.id
            }
          });
        }

        return user;
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: result.id, email: result.email, role: result.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Cache user data
      await redis.set(`user:${result.id}`, {
        id: result.id,
        email: result.email,
        role: result.role,
        firstName: result.firstName,
        lastName: result.lastName
      }, 3600);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            role: result.role
          },
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user with role-specific data
      const user = await db.getClient().user.findUnique({
        where: { email },
        include: {
          student: true,
          teacher: true,
          admin: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Cache user data
      await redis.set(`user:${user.id}`, {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }, 3600);

      // Prepare user data (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      };

      // Add role-specific data
      if (user.student) {
        userData.student = user.student;
      }
      if (user.teacher) {
        userData.teacher = user.teacher;
      }
      if (user.admin) {
        userData.admin = user.admin;
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await db.getClient().user.findUnique({
        where: { id: userId },
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

      // Prepare user data (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add role-specific data
      if (user.student) {
        userData.student = user.student;
      }
      if (user.teacher) {
        userData.teacher = user.teacher;
      }
      if (user.admin) {
        userData.admin = user.admin;
      }

      res.json({
        success: true,
        data: { user: userData }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, ...additionalData } = req.body;

      const updateData = {
        firstName,
        lastName,
        updatedAt: new Date()
      };

      // Update role-specific data
      if (req.user.role === 'STUDENT' && req.user.student) {
        const { year, semester, department, specialization, preferences } = additionalData;
        await db.getClient().student.update({
          where: { userId },
          data: {
            year,
            semester,
            department,
            specialization,
            preferences: preferences || {}
          }
        });
      } else if (req.user.role === 'TEACHER' && req.user.teacher) {
        const { department, designation, maxWorkload, availability, preferences } = additionalData;
        await db.getClient().teacher.update({
          where: { userId },
          data: {
            department,
            designation,
            maxWorkload,
            availability: availability || {},
            preferences: preferences || {}
          }
        });
      }

      // Update user basic info
      const updatedUser = await db.getClient().user.update({
        where: { id: userId },
        data: updateData,
        include: {
          student: true,
          teacher: true,
          admin: true
        }
      });

      // Update cache
      await redis.set(`user:${userId}`, {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      }, 3600);

      // Prepare response data (exclude password)
      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      // Add role-specific data
      if (updatedUser.student) {
        userData.student = updatedUser.student;
      }
      if (updatedUser.teacher) {
        userData.teacher = updatedUser.teacher;
      }
      if (updatedUser.admin) {
        userData.admin = updatedUser.admin;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: userData }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get current user
      const user = await db.getClient().user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db.getClient().user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      // Clear user cache
      await redis.del(`user:${userId}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const userId = req.user.id;

      // Clear user cache
      await redis.del(`user:${userId}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const userId = req.user.id;

      // Generate new JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AuthController();

