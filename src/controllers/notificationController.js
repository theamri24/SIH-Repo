const NotificationService = require('../services/notificationService');

class NotificationController {
  constructor() {
    this.notificationService = null; // Will be initialized with Socket.IO instance
  }

  // Initialize with Socket.IO instance
  initialize(io) {
    this.notificationService = new NotificationService(io);
  }

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.notificationService.getUserNotifications(userId, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const notification = await this.notificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const userId = req.user.id;
      const result = await this.notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: result
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const userId = req.user.id;
      const count = await this.notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.notificationService.deleteNotification(id, userId);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: result
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Send system announcement (Admin only)
  async sendSystemAnnouncement(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const { title, message, targetUsers } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
      }

      const notifications = await this.notificationService.sendSystemAnnouncement(
        title,
        message,
        targetUsers
      );

      res.json({
        success: true,
        message: 'System announcement sent successfully',
        data: { notificationsSent: notifications.length }
      });
    } catch (error) {
      console.error('Send system announcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send system announcement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get notification statistics (Admin only)
  async getNotificationStats(req, res) {
    try {
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not initialized'
        });
      }

      const stats = await this.notificationService.getNotificationStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new NotificationController();




