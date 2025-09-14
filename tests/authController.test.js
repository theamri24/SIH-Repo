const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../src/config/database', () => ({
  getClient: () => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      $transaction: jest.fn()
    },
    student: {
      create: jest.fn()
    },
    teacher: {
      create: jest.fn()
    },
    admin: {
      create: jest.fn()
    }
  })
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

// Mock bcrypt
jest.mock('bcryptjs');

// Mock jwt
jest.mock('jsonwebtoken');

const authController = require('../src/controllers/authController');

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new student successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'john.doe@student.edu',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT'
      };

      const mockStudent = {
        id: 'student123',
        studentId: 'STU001',
        userId: 'user123'
      };

      const db = require('../src/config/database').getClient();
      const redis = require('../src/config/redis');

      // Mock database calls
      db.user.findUnique.mockResolvedValue(null); // User doesn't exist
      db.$transaction.mockImplementation(async (callback) => {
        const mockPrisma = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser)
          },
          student: {
            create: jest.fn().mockResolvedValue(mockStudent)
          }
        };
        return await callback(mockPrisma);
      });

      // Mock bcrypt
      bcrypt.hash.mockResolvedValue('hashedPassword');

      // Mock jwt
      jwt.sign.mockReturnValue('mockJWTToken');

      // Mock redis
      redis.set.mockResolvedValue(true);

      const req = {
        body: {
          email: 'john.doe@student.edu',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT',
          studentId: 'STU001',
          year: 2,
          semester: 3,
          department: 'Computer Science'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 'user123',
            email: 'john.doe@student.edu',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT'
          },
          token: 'mockJWTToken'
        }
      });
    });

    it('should return error if user already exists', async () => {
      const db = require('../src/config/database').getClient();

      // Mock existing user
      db.user.findUnique.mockResolvedValue({
        id: 'existing123',
        email: 'john.doe@student.edu'
      });

      const req = {
        body: {
          email: 'john.doe@student.edu',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists'
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'john.doe@student.edu',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
        student: {
          id: 'student123',
          studentId: 'STU001'
        }
      };

      const db = require('../src/config/database').getClient();
      const redis = require('../src/config/redis');

      // Mock database call
      db.user.findUnique.mockResolvedValue(mockUser);

      // Mock bcrypt
      bcrypt.compare.mockResolvedValue(true);

      // Mock jwt
      jwt.sign.mockReturnValue('mockJWTToken');

      // Mock redis
      redis.set.mockResolvedValue(true);

      const req = {
        body: {
          email: 'john.doe@student.edu',
          password: 'password123'
        }
      };

      const res = {
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user123',
            email: 'john.doe@student.edu',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT',
            isActive: true,
            createdAt: mockUser.createdAt,
            student: mockUser.student
          },
          token: 'mockJWTToken'
        }
      });
    });

    it('should return error for invalid credentials', async () => {
      const db = require('../src/config/database').getClient();

      // Mock user not found
      db.user.findUnique.mockResolvedValue(null);

      const req = {
        body: {
          email: 'nonexistent@student.edu',
          password: 'wrongpassword'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return error for wrong password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'john.doe@student.edu',
        password: 'hashedPassword',
        isActive: true
      };

      const db = require('../src/config/database').getClient();

      // Mock user found
      db.user.findUnique.mockResolvedValue(mockUser);

      // Mock bcrypt - wrong password
      bcrypt.compare.mockResolvedValue(false);

      const req = {
        body: {
          email: 'john.doe@student.edu',
          password: 'wrongpassword'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'john.doe@student.edu',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: {
          id: 'student123',
          studentId: 'STU001'
        }
      };

      const db = require('../src/config/database').getClient();

      // Mock database call
      db.user.findUnique.mockResolvedValue(mockUser);

      const req = {
        user: {
          id: 'user123'
        }
      };

      const res = {
        json: jest.fn()
      };

      await authController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user123',
            email: 'john.doe@student.edu',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT',
            isActive: true,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            student: mockUser.student
          }
        }
      });
    });

    it('should return error if user not found', async () => {
      const db = require('../src/config/database').getClient();

      // Mock user not found
      db.user.findUnique.mockResolvedValue(null);

      const req = {
        user: {
          id: 'nonexistent123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user123',
        password: 'oldHashedPassword'
      };

      const db = require('../src/config/database').getClient();
      const redis = require('../src/config/redis');

      // Mock database calls
      db.user.findUnique.mockResolvedValue(mockUser);
      db.user.update.mockResolvedValue({});

      // Mock bcrypt
      bcrypt.compare.mockResolvedValue(true); // Current password is correct
      bcrypt.hash.mockResolvedValue('newHashedPassword');

      // Mock redis
      redis.del.mockResolvedValue(true);

      const req = {
        user: {
          id: 'user123'
        },
        body: {
          currentPassword: 'oldPassword',
          newPassword: 'newPassword123'
        }
      };

      const res = {
        json: jest.fn()
      };

      await authController.changePassword(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully'
      });
    });

    it('should return error for incorrect current password', async () => {
      const mockUser = {
        id: 'user123',
        password: 'oldHashedPassword'
      };

      const db = require('../src/config/database').getClient();

      // Mock database call
      db.user.findUnique.mockResolvedValue(mockUser);

      // Mock bcrypt - wrong current password
      bcrypt.compare.mockResolvedValue(false);

      const req = {
        user: {
          id: 'user123'
        },
        body: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect'
      });
    });
  });
});



