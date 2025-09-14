const db = require('../config/database');
const redis = require('../config/redis');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Create and send notification
  async createNotification(userId, title, message, type, data = null) {
    try {
      // Create notification in database
      const notification = await db.getClient().notification.create({
        data: {
          userId,
          title,
          message,
          type,
          data: data || {}
        }
      });

      // Send real-time notification via Socket.IO
      this.io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data,
        createdAt: notification.createdAt
      });

      // Cache notification for quick access
      await redis.set(`notification:${notification.id}`, notification, 3600);

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Send timetable update notification
  async notifyTimetableUpdate(userId, updateType, details) {
    const title = 'Timetable Updated';
    let message = '';

    switch (updateType) {
      case 'ROOM_CHANGE':
        message = `Your class "${details.courseName}" has been moved to ${details.newRoom}`;
        break;
      case 'TIME_CHANGE':
        message = `Your class "${details.courseName}" time has been changed to ${details.newTime}`;
        break;
      case 'TEACHER_ABSENT':
        message = `Your class "${details.courseName}" is cancelled due to teacher absence`;
        break;
      case 'COURSE_CANCELLED':
        message = `Your class "${details.courseName}" has been cancelled`;
        break;
      default:
        message = 'Your timetable has been updated';
    }

    return await this.createNotification(
      userId,
      title,
      message,
      'TIMETABLE_UPDATE',
      { updateType, details }
    );
  }

  // Send conflict resolution notification
  async notifyConflictResolved(userId, conflictType, resolution) {
    const title = 'Conflict Resolved';
    const message = `A ${conflictType.toLowerCase()} conflict has been automatically resolved`;

    return await this.createNotification(
      userId,
      title,
      message,
      'CONFLICT_RESOLVED',
      { conflictType, resolution }
    );
  }

  // Send system announcement
  async sendSystemAnnouncement(title, message, targetUsers = null) {
    try {
      let userIds = targetUsers;

      if (!userIds) {
        // Send to all active users
        const users = await db.getClient().user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        userIds = users.map(user => user.id);
      }

      // Create notifications for all target users
      const notifications = await Promise.all(
        userIds.map(userId => 
          this.createNotification(
            userId,
            title,
            message,
            'SYSTEM_ANNOUNCEMENT'
          )
        )
      );

      return notifications;
    } catch (error) {
      console.error('Send system announcement error:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        db.getClient().notification.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        db.getClient().notification.count({ where: { userId } })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await db.getClient().notification.update({
        where: {
          id: notificationId,
          userId // Ensure user can only mark their own notifications as read
        },
        data: { isRead: true }
      });

      // Update cache
      await redis.set(`notification:${notificationId}`, notification, 3600);

      return notification;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      await db.getClient().notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });

      // Clear notification cache for user
      const userNotifications = await db.getClient().notification.findMany({
        where: { userId },
        select: { id: true }
      });

      await Promise.all(
        userNotifications.map(notification => 
          redis.del(`notification:${notification.id}`)
        )
      );

      return { success: true };
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const count = await db.getClient().notification.count({
        where: { userId, isRead: false }
      });

      return count;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      await db.getClient().notification.delete({
        where: {
          id: notificationId,
          userId // Ensure user can only delete their own notifications
        }
      });

      // Remove from cache
      await redis.del(`notification:${notificationId}`);

      return { success: true };
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Bulk notify users about timetable generation completion
  async notifyTimetableGenerationComplete(userIds, semester, academicYear, conflicts = []) {
    const title = 'Timetable Generation Complete';
    const message = `Your timetable for ${semester} semester ${academicYear} has been generated${conflicts.length > 0 ? ` with ${conflicts.length} conflicts resolved` : ''}`;

    const notifications = await Promise.all(
      userIds.map(userId => 
        this.createNotification(
          userId,
          title,
          message,
          'TIMETABLE_UPDATE',
          { semester, academicYear, conflicts }
        )
      )
    );

    return notifications;
  }

  // Notify about room availability changes
  async notifyRoomAvailabilityChange(affectedUserIds, roomName, changeType) {
    const title = 'Room Availability Changed';
    const message = `Room ${roomName} is now ${changeType === 'AVAILABLE' ? 'available' : 'unavailable'}`;

    const notifications = await Promise.all(
      affectedUserIds.map(userId => 
        this.createNotification(
          userId,
          title,
          message,
          'ROOM_CHANGE',
          { roomName, changeType }
        )
      )
    );

    return notifications;
  }

  // Notify about teacher availability changes
  async notifyTeacherAvailabilityChange(affectedUserIds, teacherName, changeType) {
    const title = 'Teacher Availability Changed';
    const message = `Teacher ${teacherName} is now ${changeType === 'AVAILABLE' ? 'available' : 'unavailable'}`;

    const notifications = await Promise.all(
      affectedUserIds.map(userId => 
        this.createNotification(
          userId,
          title,
          message,
          'TEACHER_ABSENT',
          { teacherName, changeType }
        )
      )
    );

    return notifications;
  }

  // Clean up old notifications (run as cron job)
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await db.getClient().notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true
        }
      });

      console.log(`Cleaned up ${deletedCount.count} old notifications`);
      return deletedCount;
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const [total, unread, byType] = await Promise.all([
        db.getClient().notification.count(),
        db.getClient().notification.count({ where: { isRead: false } }),
        db.getClient().notification.groupBy({
          by: ['type'],
          _count: { id: true }
        })
      ]);

      return {
        total,
        unread,
        byType,
        readPercentage: total > 0 ? Math.round(((total - unread) / total) * 100) : 0
      };
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;



