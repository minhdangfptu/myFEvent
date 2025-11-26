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
 * Thông báo khi task hoàn thành - phân biệt Member -> HoD và HoD -> HoOC
 */
export const notifyTaskCompleted = async (eventId, taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate('departmentId')
      .populate('assigneeId');
    
    if (!task || !task.departmentId || !task.assigneeId) {
      console.log('Task, departmentId or assigneeId not found');
      return;
    }

    const departmentId = task.departmentId._id || task.departmentId;
    const assigneeMember = await EventMember.findById(task.assigneeId._id || task.assigneeId)
      .populate('userId');
    
    if (!assigneeMember || !assigneeMember.userId) {
      console.log('Assignee member not found');
      return;
    }

    const assigneeRole = assigneeMember.role;
    const taskTitle = task.title || 'Công việc';

    // Nếu Member hoàn thành -> thông báo cho HoD
    if (assigneeRole === 'Member') {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' }
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        const assigneeName = assigneeMember.userId.fullName || 'Thành viên';

        await createNotification({
          userId: hodUserId,
          eventId,
          category: 'CÔNG VIỆC',
          title: `${assigneeName} đã hoàn thành công việc "${taskTitle}"`,
          icon: 'bi bi-check-circle',
          color: '#10b981',
          relatedTaskId: taskId,
        });
        
        console.log('Notification sent to HoD:', hodUserId, 'for task:', taskTitle);
      }
    }
    // Nếu HoD hoàn thành -> thông báo cho HoOC
    else if (assigneeRole === 'HoD') {
      const hoocMembers = await EventMember.find({
        eventId,
        role: 'HoOC',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hoocMembers.length > 0) {
        const hoocUserIds = hoocMembers
          .filter(m => m.userId)
          .map(m => m.userId._id);

        if (hoocUserIds.length > 0) {
          const hodName = assigneeMember.userId.fullName || 'Trưởng ban';
          const departmentName = task.departmentId.name || 'Ban';

          await createNotificationsForUsers(hoocUserIds, {
            eventId,
            category: 'CÔNG VIỆC',
            title: `${hodName} (${departmentName}) đã hoàn thành công việc "${taskTitle}"`,
            icon: 'bi bi-check-circle',
            color: '#10b981',
            relatedTaskId: taskId,
            unread: true,
          });
          
          console.log('Notification sent to HoOC for task:', taskTitle);
        }
      }
    }
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
        role: 'HoD',
        status: { $ne: 'deactive' }
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
      status: { $ne: 'deactive' },
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
      status: { $ne: 'deactive' },
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

/**
 * Thông báo khi thành viên tham gia ban - gửi cho HoD và các Member khác trong ban
 */
export const notifyMemberJoined = async (eventId, departmentId, newMemberId) => {
  try {
    const newMember = await EventMember.findById(newMemberId)
      .populate('userId')
      .populate('departmentId');
    
    if (!newMember || !newMember.userId) {
      console.log('New member not found');
      return;
    }

    const newMemberName = newMember.userId.fullName || 'Thành viên mới';
    const departmentName = newMember.departmentId?.name || 'Ban';

    // Lấy tất cả HoD và Member khác trong ban (trừ member mới)
    const members = await EventMember.find({
      eventId,
      departmentId,
      role: { $in: ['HoD', 'Member'] },
      status: { $ne: 'deactive' },
      _id: { $ne: newMemberId },
    }).populate('userId');

    if (members.length === 0) return;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'THÀNH VIÊN',
      title: `${newMemberName} đã tham gia ${departmentName}`,
      icon: 'bi bi-person-plus',
      color: '#3b82f6',
      unread: true,
    });

    // Thông báo cho chính member mới
    await createNotification({
      userId: newMember.userId._id,
      eventId,
      category: 'THÀNH VIÊN',
      title: `Bạn đã được thêm vào ${departmentName}`,
      icon: 'bi bi-person-check',
      color: '#10b981',
      unread: true,
    });

    console.log('Notifications sent for member joined:', newMemberName);
  } catch (error) {
    console.error('Error notifying member joined:', error);
  }
};

export const notifyAddedToCalendar = async (eventId, calendarId, memberIds, calendarName) => {
  try {
    const eventMembers = await EventMember.find({ 
      _id: { $in: memberIds } 
    })
      .populate('userId', '_id fullName')
      .lean();
    
    if (eventMembers.length === 0) {
      console.log('No members found to notify');
      return 0;
    }

    const userIds = eventMembers
      .filter(member => member.userId)
      .map(member => member.userId._id);

    if (userIds.length === 0) {
      console.log('No valid userIds to notify');
      return 0;
    }

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `Bạn đã được thêm vào cuộc họp "${calendarName}"`,
      icon: 'bi bi-calendar-event',
      color: '#3b82f6',
      relatedCalendarId: calendarId,
      unread: true,
    });

    console.log(`Notification sent to ${userIds.length} users for being added to calendar:`, calendarName);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying added to calendar:', error);
    return 0;
  }
};

export const notifyRemovedFromCalendar = async (eventId, calendarId, userId, calendarName) => {
  try {
    await createNotification({
      userId,
      eventId,
      category: 'LỊCH HỌP',
      title: `Bạn đã bị xóa khỏi cuộc họp "${calendarName}"`,
      icon: 'bi bi-calendar-x',
      color: '#ef4444',
      relatedCalendarId: calendarId,
    });

    console.log('Notification sent to user for being removed from calendar:', userId);
    return 1;
  } catch (error) {
    console.error('Error notifying removed from calendar:', error);
    return 0;
  }
};

export const notifyMeetingReminder = async (eventId, calendarId, participants, calendarName, startAt) => {
  try {
    const meetingDate = new Date(startAt).toLocaleDateString('vi-VN');

    const userIds = participants
      .filter(p => p.member && p.member.userId)
      .map(p => p.member.userId._id);

    if (userIds.length === 0) {
      console.log('No valid participants to send reminder');
      return 0;
    }

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `Nhắc nhở: Cuộc họp "${calendarName}" vào ${meetingDate}`,
      icon: 'bi bi-bell',
      color: '#f59e0b',
      relatedCalendarId: calendarId,
      unread: true,
    });

    console.log(`Reminder notification sent to ${userIds.length} users for calendar:`, calendarName);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying meeting reminder:', error);
    return 0;
  }
};

export const notifyCalendarUpdated = async (eventId, calendarId, participants, calendarName) => {
  try {
    const userIds = participants
      .filter(p => p.member && p.member.userId)
      .map(p => p.member.userId._id);

    if (userIds.length === 0) {
      console.log('No valid participants to notify about calendar update');
      return 0;
    }

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `Cuộc họp "${calendarName}" đã được cập nhật`,
      icon: 'bi bi-calendar-check',
      color: '#10b981',
      relatedCalendarId: calendarId,
      unread: true,
    });

    console.log(`Update notification sent to ${userIds.length} users for calendar:`, calendarName);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying calendar updated:', error);
    return 0;
  }
};

