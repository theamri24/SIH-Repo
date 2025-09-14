const jwt = require('jsonwebtoken');
const db = require('./database');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware for Socket.IO
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and is active
        const user = await db.getClient().user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, role: true, isActive: true }
        });

        if (!user || !user.isActive) {
          return next(new Error('Invalid or inactive user'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected via Socket.IO`);

      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);

      // Join role-based rooms
      socket.join(`role:${socket.userRole}`);

      // Handle user joining specific rooms
      socket.on('join-room', (roomName) => {
        socket.join(roomName);
        console.log(`User ${socket.userId} joined room: ${roomName}`);
      });

      // Handle user leaving specific rooms
      socket.on('leave-room', (roomName) => {
        socket.leave(roomName);
        console.log(`User ${socket.userId} left room: ${roomName}`);
      });

      // Handle typing indicators (for chat features if needed)
      socket.on('typing-start', (data) => {
        socket.to(data.room).emit('user-typing', {
          userId: socket.userId,
          isTyping: true
        });
      });

      socket.on('typing-stop', (data) => {
        socket.to(data.room).emit('user-typing', {
          userId: socket.userId,
          isTyping: false
        });
      });

      // Handle real-time timetable updates
      socket.on('subscribe-timetable', (data) => {
        const { semester, academicYear } = data;
        socket.join(`timetable:${semester}:${academicYear}`);
        console.log(`User ${socket.userId} subscribed to timetable updates for ${semester} ${academicYear}`);
      });

      socket.on('unsubscribe-timetable', (data) => {
        const { semester, academicYear } = data;
        socket.leave(`timetable:${semester}:${academicYear}`);
        console.log(`User ${socket.userId} unsubscribed from timetable updates for ${semester} ${academicYear}`);
      });

      // Handle room availability updates
      socket.on('subscribe-room-updates', () => {
        socket.join('room-updates');
        console.log(`User ${socket.userId} subscribed to room updates`);
      });

      socket.on('unsubscribe-room-updates', () => {
        socket.leave('room-updates');
        console.log(`User ${socket.userId} unsubscribed from room updates`);
      });

      // Handle teacher availability updates
      socket.on('subscribe-teacher-updates', () => {
        socket.join('teacher-updates');
        console.log(`User ${socket.userId} subscribed to teacher updates`);
      });

      socket.on('unsubscribe-teacher-updates', () => {
        socket.leave('teacher-updates');
        console.log(`User ${socket.userId} unsubscribed from teacher updates`);
      });

      // Handle AI generation progress
      socket.on('subscribe-ai-progress', (data) => {
        const { generationId } = data;
        socket.join(`ai-progress:${generationId}`);
        console.log(`User ${socket.userId} subscribed to AI progress for generation ${generationId}`);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.userId} disconnected: ${reason}`);
        this.connectedUsers.delete(socket.userId);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
      });
    });
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send to users by role
  sendToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  // Send to users in a specific room
  sendToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, data);
  }

  // Send to multiple users
  sendToUsers(userIds, event, data) {
    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  // Broadcast timetable update
  broadcastTimetableUpdate(semester, academicYear, updateType, details) {
    this.sendToRoom(`timetable:${semester}:${academicYear}`, 'timetable-update', {
      type: updateType,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast room availability change
  broadcastRoomAvailabilityChange(roomId, roomName, changeType) {
    this.sendToRoom('room-updates', 'room-availability-change', {
      roomId,
      roomName,
      changeType,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast teacher availability change
  broadcastTeacherAvailabilityChange(teacherId, teacherName, changeType) {
    this.sendToRoom('teacher-updates', 'teacher-availability-change', {
      teacherId,
      teacherName,
      changeType,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast AI generation progress
  broadcastAIProgress(generationId, progress, status, message) {
    this.sendToRoom(`ai-progress:${generationId}`, 'ai-generation-progress', {
      generationId,
      progress,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  async getConnectedUsersByRole(role) {
    const connectedUsers = [];
    
    for (const [userId, socketId] of this.connectedUsers) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.userRole === role) {
        connectedUsers.push(userId);
      }
    }
    
    return connectedUsers;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get user's socket ID
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }

  // Force disconnect user
  disconnectUser(userId) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        this.connectedUsers.delete(userId);
        return true;
      }
    }
    return false;
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedUsers.size,
      connectionsByRole: {},
      timestamp: new Date().toISOString()
    };

    // Count connections by role
    for (const [userId, socketId] of this.connectedUsers) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        const role = socket.userRole;
        stats.connectionsByRole[role] = (stats.connectionsByRole[role] || 0) + 1;
      }
    }

    return stats;
  }
}

module.exports = SocketManager;




