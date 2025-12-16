import Notification from '../models/notification.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import Task from '../models/task.js';
import Department from '../models/department.js';

const formatEventName = (event) => {
  const name = typeof event?.name === 'string' ? event.name.trim() : '';
  return name ? `[Sự kiện ${name}]` : 'Sự kiện';
};

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
  color = '#aaaaaaff',
  relatedTaskId = null,
  relatedMilestoneId = null,
  relatedAgendaId = null,
  relatedCalendarId = null,
  relatedBudgetId = null,
  relatedExpenseId = null,
  relatedFeedbackId = null,
  relatedRiskId = null,
  relatedItemId = null,
  targetUrl = null,
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
      relatedCalendarId,
      relatedBudgetId,
      relatedExpenseId,
      relatedFeedbackId,
      relatedRiskId,
      relatedItemId,
      targetUrl,
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    await createNotification({
      userId: assigneeUserId,
      eventId,
      category: 'CÔNG VIỆC',
      title: `[${eventName}] Bạn đã được giao công việc "${taskTitle}"`,
      icon: 'bi bi-asterisk',
      color: '#ee4b4bff',
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);
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
          title: `[${eventName}] ${assigneeName} đã hoàn thành công việc "${taskTitle}"`,
          icon: 'bi bi-check-circle',
          color: '#ee4b4bff',
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
            title: `[${eventName}] ${hodName} (${departmentName}) đã hoàn thành công việc "${taskTitle}"`,
            icon: 'bi bi-check-circle',
            color: '#ee4b4bff',
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);
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
      title: `[${eventName}] Công việc "${taskTitle}" đã quá hạn`,
      icon: 'bi bi-exclamation-triangle',
      color: '#ee4b4bff',
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

    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

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
      ? `[${eventName}] Công việc lớn "${taskTitle}" đã hoàn thành`
      : `[${eventName}] Công việc lớn "${taskTitle}" đã quá hạn`;

    await createNotificationsForUsers(hoocUserIds, {
      eventId,
      category: 'CÔNG VIỆC',
      title,
      icon: isCompleted ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle',
      color: '#ee4b4bff',
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    if (members.length === 0) return;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title:  `[${eventName}] Bạn có lịch họp mới  `,
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

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
      title: `[${eventName}] ${newMemberName} đã tham gia ${departmentName}`,
      icon: 'bi bi-person-plus',
      color: '#f59e0b',
      unread: true,
    });

    // Thông báo cho chính member mới
    await createNotification({
      userId: newMember.userId._id,
      eventId,
      category: 'THÀNH VIÊN',
      title: `[${eventName}] Bạn đã được thêm vào ${departmentName}`,
      icon: 'bi bi-person-check',
      color: '#f59e0b',
      unread: true,
    });

    console.log('Notifications sent for member joined:', newMemberName);
  } catch (error) {
    console.error('Error notifying member joined:', error);
  }
};

export const notifyAddedToCalendar = async ({ eventId, calendarId, userIds, calendarName, creatorUserId }) => {
  try {
    void creatorUserId;
    const filteredUserIds = (userIds || []).filter(Boolean);
    if (filteredUserIds.length === 0) {
      console.log('No valid userIds to notify for calendar');
      return 0;
    }

    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    await createNotificationsForUsers(filteredUserIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `[${eventName}] Bạn đã được thêm vào cuộc họp "${calendarName}"`,
      icon: 'bi bi-calendar-event',
      color: '#3b82f6',
      relatedCalendarId: calendarId,
      unread: true,
    });

    console.log(`Notification sent to ${filteredUserIds.length} users for calendar:`, calendarName);
    return filteredUserIds.length;
  } catch (error) {
    console.error('Error notifying added to calendar:', error);
    return 0;
  }
};

export const notifyRemovedFromCalendar = async (eventId, calendarId, userId, calendarName) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);
    await createNotification({
      userId,
      eventId,
      category: 'LỊCH HỌP',
      title: `[${eventName}] Bạn đã bị xóa khỏi cuộc họp "${calendarName}"`,
      icon: 'bi bi-calendar-x',
      color: '#3b82f6',
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
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);
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
      title: `[${eventName}] Nhắc nhở: Cuộc họp "${calendarName}" vào ${meetingDate}`,
      icon: 'bi bi-bell',
      color: '#3b82f6',
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

    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `[${eventName}] Cuộc họp "${calendarName}" đã được cập nhật, vui lòng xác nhận lại`,
      icon: 'bi bi-calendar-check',
      color: '#3b82f6',
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

// ========== BUDGET NOTIFICATIONS ==========

/**
 * Thông báo khi HoD submit budget - gửi cho HoOC
 */
export const notifyBudgetSubmitted = async (eventId, departmentId, budgetId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);
    
    const department = await Department.findById(departmentId).select('name').lean();
    const departmentName = department?.name || 'Ban';

    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (hoocMembers.length === 0) return 0;

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (hoocUserIds.length === 0) return 0;

    await createNotificationsForUsers(hoocUserIds, {
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] ${departmentName} đã nộp ngân sách`,
      icon: 'bi bi-wallet2',
      color: '#10b981',
      relatedBudgetId: budgetId,
      targetUrl: `/events/${eventId}/departments/${departmentId}/budget/review`,
      unread: true,
    });

    console.log(`Budget submitted notification sent to ${hoocUserIds.length} HoOC members`);
    return hoocUserIds.length;
  } catch (error) {
    console.error('Error notifying budget submitted:', error);
    return 0;
  }
};

/**
 * Thông báo khi HoOC approve budget - gửi cho HoD
 */
export const notifyBudgetApproved = async (eventId, departmentId, budgetId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const hodMember = await EventMember.findOne({
      eventId,
      departmentId,
      role: 'HoD',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (!hodMember || !hodMember.userId) return 0;

    await createNotification({
      userId: hodMember.userId._id,
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] Ngân sách của bạn đã được duyệt`,
      icon: 'bi bi-check-circle',
      color: '#10b981',
      relatedBudgetId: budgetId,
      targetUrl: `/events/${eventId}/departments/${departmentId}/budget/${budgetId}`,
      unread: true,
    });

    console.log('Budget approved notification sent to HoD');
    return 1;
  } catch (error) {
    console.error('Error notifying budget approved:', error);
    return 0;
  }
};

/**
 * Thông báo khi HoOC reject budget - gửi cho HoD
 */
export const notifyBudgetRejected = async (eventId, departmentId, budgetId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const hodMember = await EventMember.findOne({
      eventId,
      departmentId,
      role: 'HoD',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (!hodMember || !hodMember.userId) return 0;

    await createNotification({
      userId: hodMember.userId._id,
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] Ngân sách của bạn đã bị từ chối`,
      icon: 'bi bi-x-circle',
      color: '#ef4444',
      relatedBudgetId: budgetId,
      targetUrl: `/events/${eventId}/departments/${departmentId}/budget/${budgetId}/edit`,
      unread: true,
    });

    console.log('Budget rejected notification sent to HoD');
    return 1;
  } catch (error) {
    console.error('Error notifying budget rejected:', error);
    return 0;
  }
};

/**
 * Thông báo khi HoD gửi budget xuống members - gửi cho tất cả Members trong ban
 */
export const notifyBudgetSentToMembers = async (eventId, departmentId, budgetId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const members = await EventMember.find({
      eventId,
      departmentId,
      role: 'Member',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (members.length === 0) return 0;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] Ngân sách đã được gửi xuống, vui lòng xem và báo cáo chi tiêu`,
      icon: 'bi bi-wallet2',
      color: '#10b981',
      relatedBudgetId: budgetId,
      targetUrl: `/events/${eventId}/budgets/member`,
      unread: true,
    });

    console.log(`Budget sent to members notification sent to ${userIds.length} members`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying budget sent to members:', error);
    return 0;
  }
};

/**
 * Thông báo khi HoD gán item cho Member - gửi cho Member được gán
 */
export const notifyItemAssigned = async (eventId, departmentId, budgetId, itemId, memberId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const member = await EventMember.findById(memberId).populate('userId');
    if (!member || !member.userId) return 0;

    await createNotification({
      userId: member.userId._id,
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] Bạn đã được gán một hạng mục trong ngân sách`,
      icon: 'bi bi-person-check',
      color: '#10b981',
      relatedBudgetId: budgetId,
      relatedItemId: itemId,
      targetUrl: `/events/${eventId}/budgets/member`,
      unread: true,
    });

    console.log('Item assigned notification sent to member');
    return 1;
  } catch (error) {
    console.error('Error notifying item assigned:', error);
    return 0;
  }
};

// ========== EXPENSE NOTIFICATIONS ==========

/**
 * Thông báo khi Member báo cáo chi tiêu - gửi cho HoD
 */
export const notifyExpenseReported = async (eventId, departmentId, budgetId, itemId, memberId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const member = await EventMember.findById(memberId).populate('userId');
    const memberName = member?.userId?.fullName || 'Thành viên';

    const hodMember = await EventMember.findOne({
      eventId,
      departmentId,
      role: 'HoD',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (!hodMember || !hodMember.userId) return 0;

    await createNotification({
      userId: hodMember.userId._id,
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] ${memberName} đã báo cáo chi tiêu`,
      icon: 'bi bi-receipt',
      color: '#f59e0b',
      relatedBudgetId: budgetId,
      relatedItemId: itemId,
      targetUrl: `/events/${eventId}/departments/${departmentId}/budget/${budgetId}`,
      unread: true,
    });

    console.log('Expense reported notification sent to HoD');
    return 1;
  } catch (error) {
    console.error('Error notifying expense reported:', error);
    return 0;
  }
};

/**
 * Thông báo khi Member submit expense - gửi cho HoD
 */
export const notifyExpenseSubmitted = async (eventId, departmentId, budgetId, itemId, memberId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const member = await EventMember.findById(memberId).populate('userId');
    const memberName = member?.userId?.fullName || 'Thành viên';

    const hodMember = await EventMember.findOne({
      eventId,
      departmentId,
      role: 'HoD',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (!hodMember || !hodMember.userId) return 0;

    await createNotification({
      userId: hodMember.userId._id,
      eventId,
      category: 'TÀI CHÍNH',
      title: `[${eventName}] ${memberName} đã nộp chi tiêu`,
      icon: 'bi bi-check-circle',
      color: '#f59e0b',
      relatedBudgetId: budgetId,
      relatedItemId: itemId,
      targetUrl: `/events/${eventId}/departments/${departmentId}/budget/${budgetId}`,
      unread: true,
    });

    console.log('Expense submitted notification sent to HoD');
    return 1;
  } catch (error) {
    console.error('Error notifying expense submitted:', error);
    return 0;
  }
};

// ========== FEEDBACK NOTIFICATIONS ==========

/**
 * Thông báo khi HoOC publish form - gửi cho tất cả Members và HoD
 */
export const notifyFormPublished = async (eventId, formId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const members = await EventMember.find({
      eventId,
      role: { $in: ['Member', 'HoD'] },
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (members.length === 0) return 0;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'PHẢN HỒI',
      title: `[${eventName}] Có form phản hồi mới, vui lòng điền`,
      icon: 'bi bi-chat-square-text',
      color: '#8b5cf6',
      relatedFeedbackId: formId,
      targetUrl: `/events/${eventId}/feedback/member`,
      unread: true,
    });

    console.log(`Form published notification sent to ${userIds.length} members and HoD`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying form published:', error);
    return 0;
  }
};

/**
 * Thông báo khi Member submit response - gửi cho HoOC
 */
export const notifyResponseSubmitted = async (eventId, formId, memberId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const member = await EventMember.findById(memberId).populate('userId');
    const memberName = member?.userId?.fullName || 'Thành viên';

    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (hoocMembers.length === 0) return 0;

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (hoocUserIds.length === 0) return 0;

    await createNotificationsForUsers(hoocUserIds, {
      eventId,
      category: 'PHẢN HỒI',
      title: `[${eventName}] ${memberName} đã nộp phản hồi`,
      icon: 'bi bi-check-circle',
      color: '#8b5cf6',
      relatedFeedbackId: formId,
      targetUrl: `/events/${eventId}/feedback/${formId}/summary`,
      unread: true,
    });

    console.log(`Response submitted notification sent to ${hoocUserIds.length} HoOC members`);
    return hoocUserIds.length;
  } catch (error) {
    console.error('Error notifying response submitted:', error);
    return 0;
  }
};

// ========== AGENDA NOTIFICATIONS ==========

/**
 * Thông báo khi agenda được cập nhật - gửi cho tất cả participants
 */
export const notifyAgendaUpdated = async (eventId, milestoneId, agendaId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    // Lấy tất cả HoD và Member của event (vì agenda thường gửi cho tất cả)
    const members = await EventMember.find({
      eventId,
      role: { $in: ['HoD', 'Member'] },
      status: { $ne: 'deactive' },
    }).populate('userId');

    if (members.length === 0) return 0;

    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId._id);

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'LỊCH HỌP',
      title: `[${eventName}] Lịch họp đã được cập nhật`,
      icon: 'bi bi-calendar-check',
      color: '#3b82f6',
      relatedAgendaId: agendaId,
      relatedMilestoneId: milestoneId,
      targetUrl: `/events/${eventId}/milestones/${milestoneId}/agenda/${agendaId}`,
      unread: true,
    });

    console.log(`Agenda updated notification sent to ${userIds.length} participants`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying agenda updated:', error);
    return 0;
  }
};

// ========== RISK NOTIFICATIONS ==========

/**
 * Thông báo khi risk được tạo - gửi cho HoOC (nếu event scope) hoặc HoOC + HoD (nếu department scope)
 */
export const notifyRiskCreated = async (eventId, riskId, riskScope, departmentId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const userIds = [];

    // Luôn gửi cho HoOC
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);
    userIds.push(...hoocUserIds);

    // Nếu là department scope, gửi cho HoD của ban đó
    if (riskScope === 'department' && departmentId) {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Có rủi ro mới được tạo`,
      icon: 'bi bi-exclamation-triangle',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log(`Risk created notification sent to ${userIds.length} users`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying risk created:', error);
    return 0;
  }
};

/**
 * Thông báo khi risk được cập nhật - gửi cho HoOC + HoD liên quan
 */
export const notifyRiskUpdated = async (eventId, riskId, riskScope, departmentId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const userIds = [];

    // Luôn gửi cho HoOC
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);
    userIds.push(...hoocUserIds);

    // Nếu là department scope, gửi cho HoD của ban đó
    if (riskScope === 'department' && departmentId) {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Rủi ro đã được cập nhật`,
      icon: 'bi bi-pencil',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log(`Risk updated notification sent to ${userIds.length} users`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying risk updated:', error);
    return 0;
  }
};

/**
 * Thông báo khi risk được gán cho người khác - gửi cho người được gán
 */
export const notifyRiskAssigned = async (eventId, riskId, assigneeId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const assigneeMember = await EventMember.findById(assigneeId).populate('userId');
    if (!assigneeMember || !assigneeMember.userId) return 0;

    await createNotification({
      userId: assigneeMember.userId._id,
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Bạn đã được gán một rủi ro`,
      icon: 'bi bi-person-check',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log('Risk assigned notification sent to assignee');
    return 1;
  } catch (error) {
    console.error('Error notifying risk assigned:', error);
    return 0;
  }
};

/**
 * Thông báo khi risk xảy ra - gửi cho HoOC + HoD liên quan
 */
export const notifyRiskOccurred = async (eventId, riskId, occurredRiskId, riskScope, departmentId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const userIds = [];

    // Luôn gửi cho HoOC
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);
    userIds.push(...hoocUserIds);

    // Nếu là department scope, gửi cho HoD của ban đó
    if (riskScope === 'department' && departmentId) {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Rủi ro đã xảy ra`,
      icon: 'bi bi-exclamation-triangle-fill',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log(`Risk occurred notification sent to ${userIds.length} users`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying risk occurred:', error);
    return 0;
  }
};

/**
 * Thông báo khi occurred risk được cập nhật - gửi cho HoOC + HoD liên quan
 */
export const notifyOccurredRiskUpdated = async (eventId, riskId, occurredRiskId, riskScope, departmentId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const userIds = [];

    // Luôn gửi cho HoOC
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);
    userIds.push(...hoocUserIds);

    // Nếu là department scope, gửi cho HoD của ban đó
    if (riskScope === 'department' && departmentId) {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return 0;

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Cập nhật về rủi ro đã xảy ra`,
      icon: 'bi bi-pencil',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log(`Occurred risk updated notification sent to ${userIds.length} users`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying occurred risk updated:', error);
    return 0;
  }
};

/**
 * Thông báo khi risk status thay đổi - gửi cho HoOC + HoD liên quan
 */
export const notifyRiskStatusChanged = async (eventId, riskId, oldStatus, newStatus, riskScope, departmentId) => {
  try {
    const event = await Event.findById(eventId).select('name').lean();
    const eventName = formatEventName(event);

    const userIds = [];

    // Luôn gửi cho HoOC
    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' },
    }).populate('userId');

    const hoocUserIds = hoocMembers
      .filter(m => m.userId)
      .map(m => m.userId._id);
    userIds.push(...hoocUserIds);

    // Nếu là department scope, gửi cho HoD của ban đó
    if (riskScope === 'department' && departmentId) {
      const hodMember = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' },
      }).populate('userId');

      if (hodMember && hodMember.userId) {
        const hodUserId = hodMember.userId._id;
        if (!userIds.includes(hodUserId)) {
          userIds.push(hodUserId);
        }
      }
    }

    if (userIds.length === 0) return 0;

    const statusLabels = {
      'not_yet': 'Chưa xảy ra',
      'resolving': 'Đang xử lý',
      'resolved': 'Đã xử lý',
    };

    await createNotificationsForUsers(userIds, {
      eventId,
      category: 'RỦI RO',
      title: `[${eventName}] Trạng thái rủi ro đã thay đổi: ${statusLabels[newStatus] || newStatus}`,
      icon: 'bi bi-arrow-repeat',
      color: '#ef4444',
      relatedRiskId: riskId,
      targetUrl: `/events/${eventId}/risks/detail/${riskId}`,
      unread: true,
    });

    console.log(`Risk status changed notification sent to ${userIds.length} users`);
    return userIds.length;
  } catch (error) {
    console.error('Error notifying risk status changed:', error);
    return 0;
  }
};

