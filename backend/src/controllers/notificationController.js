/* eslint-disable no-unused-vars */
import Notification from '../models/notification.js';
import EventMember from '../models/eventMember.js';
import Department from '../models/department.js';
import User from '../models/user.js';

// GET /api/notifications - Lấy tất cả notifications của user hiện tại
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread, limit = 50 } = req.query;

    let filter = { userId };
    if (unread !== undefined) {
      filter.unread = unread === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.status(200).json({ data: notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({ message: 'Lỗi lấy thông báo' });
  }
};

// PATCH /api/notifications/:notificationId/read - Đánh dấu đã đọc
export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { unread: false },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    return res.status(200).json({ data: notification });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
};

// PATCH /api/notifications/read-all - Đánh dấu tất cả đã đọc
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, unread: true },
      { unread: false }
    );

    return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo đã đọc' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
};

// GET /api/notifications/unread-count - Lấy số lượng thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({ userId, unread: true });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ message: 'Lỗi lấy số lượng thông báo' });
  }
};

