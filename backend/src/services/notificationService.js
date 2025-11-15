import Notification from '../models/notification.js';
import EventMember from '../models/eventMember.js';
import Department from '../models/department.js';
import Task from '../models/task.js';

/**
 * Tạo thông báo cho một user
 */
export const createNotification = async ({
  userId,
  eventId,
  category = 'KHÁC',
  title,
  icon = 'bi bi-bell',
  avatarUrl = '/logo-03.png',
  color = '#ef4444',
  relatedTaskId = null,
  relatedMilestoneId = null,
  relatedAgendaId = null,
}) => {
  try {
    const notification = new Notification({
      userId,
      eventId,
      category,
      title,
      icon,
      avatarUrl,
      color,
      relatedTaskId,
      relatedMilestoneId,
      relatedAgendaId,
      unread: true,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Tạo thông báo cho nhiều users
 */
export const createNotificationsForUsers = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId,
    }));

    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error('Error creating notifications for users:', error);
    throw error;
  }
};

/**
 * Thông báo khi giao việc cho Member
 */
export const notifyTaskAssigned = async (eventId, taskId, assigneeId) => {
  try {
    const task = await Task.findById(taskId).populate('assigneeId');
    if (!task || !task.assigneeId) return;

    const assigneeMember = await EventMember.findById(assigneeId).populate('userId');
    if (!assigneeMember || !assigneeMember.userId) return;

    const assigneeUserId = assigneeMember.userId._id;
    const taskTitle = task.title || 'Công việc';

    // Lấy thông tin người giao việc (từ req.user trong controller)
    // Tạm thời dùng "HoOC" hoặc lấy từ context

    await createNotification({
      userId: assigneeUserId,
      eventId,
      category: 'CÔNG VIỆC',
      title: `Bạn đã được giao công việc "${taskTitle}"`,
      icon: 'bi bi-asterisk',
      color: '#ef4444',
      relatedTaskId: taskId,
    });
  } catch (error) {
    console.error('Error notifying task assigned:', error);
  }
};

/**
 * Thông báo khi task hoàn thành - gửi cho HoD
 */
export const notifyTaskCompleted = async (eventId, taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate('departmentId')
      .populate('assigneeId');
    
    if (!task || !task.departmentId) {
      console.log('Task or departmentId not found');
      return;
    }

    const departmentId = task.departmentId._id || task.departmentId;
    
    // Tìm HoD của department này
    const hodMember = await EventMember.findOne({
      eventId,
      departmentId,
      role: 'HoD'
    }).populate('userId');

    if (!hodMember || !hodMember.userId) {
      console.log('HoD not found for department:', departmentId);
      return;
    }

    const hodUserId = hodMember.userId._id;
    const taskTitle = task.title || 'Công việc';

    await createNotification({
      userId: hodUserId,
      eventId,
      category: 'CÔNG VIỆC',
      title: `Công việc "${taskTitle}" đã được hoàn thành`,
      icon: 'bi bi-check-circle',
      color: '#10b981',
      relatedTaskId: taskId,
    });
    
    console.log('Notification sent to HoD:', hodUserId, 'for task:', taskTitle);
  } catch (error) {
    console.error('Error notifying task completed:', error);
  }
};

/**
 * Thông báo khi task quá hạn - gửi cho Member và HoD
 */
export const notifyTaskOverdue = async (eventId, taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate('assigneeId')
      .populate('departmentId');
    
    if (!task) return;

    const userIds = [];

    // Thông báo cho Member được giao việc
    if (task.assigneeId) {
      const assigneeMember = await EventMember.findById(task.assigneeId._id).populate('userId');
      if (assigneeMember && assigneeMember.userId) {
        userIds.push(assigneeMember.userId._id);
      }
    }

    // Thông báo cho HoD
    if (task.departmentId) {
      const departmentId = task.departmentId._id || task.departmentId;
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD'
      }).populate('userId');
      
      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return;

    const taskTitle = task.title || 'Công việc';
    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'CÔNG VIỆC',
      title: `Công việc "${taskTitle}" đã quá hạn`,
      icon: 'bi bi-exclamation-triangle',
      color: '#ef4444',
      relatedTaskId: taskId,
      unread: true,
    });
  } catch (error) {
    console.error('Error notifying task overdue:', error);
  }
};

/**
 * Thông báo khi công việc lớn của ban quá hạn/hoàn thành - gửi cho HoOC
 */
export const notifyMajorTaskStatus = async (eventId, taskId, isCompleted) => {
  try {
    const task = await Task.findById(taskId).populate('departmentId');
    if (!task) return;

    // Kiểm tra xem có phải task lớn không (không có parentId)
    const isMajorTask = !task.parentId;
    if (!isMajorTask) return; // Chỉ là task con, không phải task lớn

    // Lấy tất cả HoOC của event
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
    }).populate('userId');

    if (hoocMembers.length === 0) return;

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (hoocUserIds.length === 0) return;

    const taskTitle = task.title || 'Công việc';
    const title = isCompleted
      ? `Công việc lớn "${taskTitle}" đã hoàn thành`
      : `Công việc lớn "${taskTitle}" đã quá hạn`;

    await createNotificationsForUsers(hoocUserIds, {
      eventId,
      category: 'CÔNG VIỆC',
      title,
      icon: isCompleted ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle',
      color: isCompleted ? '#10b981' : '#ef4444',
      relatedTaskId: taskId,
      unread: true,
    });
  } catch (error) {
    console.error('Error notifying major task status:', error);
  }
};

/**
 * Thông báo khi HoOC tạo lịch họp - gửi cho HoD và Member
 */
export const notifyAgendaCreated = async (eventId, agendaId, milestoneId) => {
  try {
    // Lấy tất cả HoD và Member của event
    const members = await EventMember.find({
      eventId,
      role: { $in: ['HoD', 'Member'] },
    }).populate('userId');

    if (members.length === 0) return;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: 'Bạn có lịch họp mới',
      icon: 'bi bi-calendar-event',
      color: '#3b82f6',
      relatedAgendaId: agendaId,
      relatedMilestoneId: milestoneId,
      unread: true,
    });
  } catch (error) {
    console.error('Error notifying agenda created:', error);
  }
};

