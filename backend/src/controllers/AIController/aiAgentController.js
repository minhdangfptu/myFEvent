// src/controllers/AIController/aiAgentController.js
import axios from 'axios';
import { config } from '../../config/environment.js';
import Event from '../../models/event.js';
import ConversationHistory from '../../models/conversationHistory.js';
import Department from '../../models/department.js';
import Task from '../../models/task.js';
import EventMember from '../../models/eventMember.js';
import Risk from '../../models/risk.js';
import Calendar from '../../models/calendar.js';
import Milestone from '../../models/milestone.js';
import EventBudgetPlan from '../../models/budgetPlanDep.js';
import EventExpense from '../../models/expense.js';
import mongoose from 'mongoose';
import { fetchExpensesForBudgets, decimalToNumber } from '../../services/expenseService.js';

const AI_AGENT_BASE_URL = config.AI_AGENT_BASE_URL || 'http://localhost:9000';
const CHANNEL_AGENT = 'event_planner_agent';
const SELF_BASE_URL =
config.SELF_BASE_URL || `https://myfevent-ai-assistant-production.up.railway.app/`;
const BACKEND_BASE_URL = config.BACKEND_BASE_URL || 'http://localhost:8080'; // Thêm dòng này

// Hiển thị nhãn tiếng Việt cho role
const roleLabel = (role) => {
  switch ((role || '').trim()) {
    case 'HoOC':
      return 'Trưởng ban tổ chức';
    case 'HoD':
      return 'Trưởng ban';
    case 'Member':
      return 'Thành viên';
    default:
      return role || 'Chưa rõ';
  }
};

const generateTitleFromText = (text = '') => {
  if (!text || typeof text !== 'string') return 'Cuộc trò chuyện mới';
  const words = text.trim().split(/\s+/);
  const firstFive = words.slice(0, 5).join(' ');
  return words.length > 5 ? `${firstFive} ...` : firstFive;
};

/**
 * Helper function để lấy thông tin chi tiết đầy đủ của sự kiện cho AI
 * Tương tự như getEventDetailForAI nhưng được gọi nội bộ
 */
const getFullEventContext = async (eventId, userId) => {
  try {
    // 1) Lấy event cơ bản
    const event = await Event.findById(eventId)
      .select(
        'name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt'
      )
      .lean();

    if (!event) {
      return null;
    }

    // 2) Lấy thông tin membership của user hiện tại
    let currentUserMembership = null;
    if (userId) {
      currentUserMembership = await EventMember.findOne({
        eventId,
        userId,
        status: { $ne: 'deactive' },
      })
        .populate('departmentId', 'name')
        .lean();
    }

    // Kiểm tra quyền truy cập
    if (event.type !== 'public' && !currentUserMembership) {
      return null; // Không có quyền truy cập
    }

    const userRole = currentUserMembership?.role || null;
    const userDepartmentId = currentUserMembership?.departmentId?._id || null;

    // 3) Lấy danh sách phòng ban
    const departments = await Department.find({ eventId })
      .select('_id name description leaderId createdAt updatedAt')
      .lean();

    // 4) Lấy danh sách member active
    const members = await EventMember.find({
      eventId,
      status: 'active',
    })
      .select('userId departmentId role status')
      .populate('userId', 'name email')
      .populate('departmentId', 'name')
      .lean();

    const memberCountByDept = {};
    const memberCountByRole = { HoOC: 0, HoD: 0, Member: 0 };
    let totalMembers = 0;
    members.forEach((m) => {
      totalMembers += 1;
      const key = m.departmentId ? String(m.departmentId._id) : 'no_dept';
      memberCountByDept[key] = (memberCountByDept[key] || 0) + 1;
      if (m.role && memberCountByRole[m.role] !== undefined) {
        memberCountByRole[m.role] += 1;
      }
    });

    // Lấy danh sách members với thông tin chi tiết (role, department) - lọc theo quyền
    // Lưu ý: KHÔNG hiển thị email của người khác, chỉ hiển thị email của chính người dùng
    let membersDetail = [];
    if (userRole === 'HoOC') {
      // HoOC xem tất cả thông tin nhưng không có email của người khác
      membersDetail = members.map((m) => {
        const isSelf = String(m.userId?._id) === String(userId);
        return {
          _id: m._id,
          userId: m.userId?._id,
          userName: m.userId?.name,
          userEmail: isSelf ? m.userId?.email : undefined, // Chỉ hiển thị email của chính mình
          role: m.role,
          departmentId: m.departmentId?._id,
          departmentName: m.departmentId?.name,
        };
      });
    } else if (userRole === 'HoD' && userDepartmentId) {
      // HoD chỉ xem ban của mình + thông tin chung
      membersDetail = members
        .filter((m) => 
          !m.departmentId || 
          String(m.departmentId._id) === String(userDepartmentId) ||
          String(m.userId?._id) === String(userId)
        )
        .map((m) => {
          const isSelf = String(m.userId?._id) === String(userId);
          return {
            _id: m._id,
            userId: m.userId?._id,
            userName: m.userId?.name,
            userEmail: isSelf ? m.userId?.email : undefined, // Chỉ hiển thị email của chính mình
            role: m.role,
            departmentId: m.departmentId?._id,
            departmentName: m.departmentId?.name,
          };
        });
    } else {
      // Member chỉ xem thông tin chung
      membersDetail = members.map((m) => {
        const isSelf = String(m.userId?._id) === String(userId);
        return {
          _id: m._id,
          userId: isSelf ? m.userId?._id : undefined,
          userName: m.userId?.name,
          userEmail: isSelf ? m.userId?.email : undefined, // Chỉ hiển thị email của chính mình
          role: m.role,
          departmentId: m.departmentId?._id,
          departmentName: m.departmentId?.name,
        };
      });
    }

    // 5) Lấy EPIC và TASK
    const epics = await Task.find({ eventId, taskType: 'epic' })
      .select('_id title description departmentId status')
      .populate('departmentId', 'name')
      .lean();

    const tasks = await Task.find({ eventId, taskType: 'normal' })
      .select(
        '_id title description parentId departmentId status priority startDate dueDate'
      )
      .lean();

    const tasksByEpic = {};
    tasks.forEach((t) => {
      const key = t.parentId ? String(t.parentId) : 'no_epic';
      if (!tasksByEpic[key]) tasksByEpic[key] = [];
      tasksByEpic[key].push({
        _id: t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        dueDate: t.dueDate,
      });
    });

    const epicsWithTasks = epics.map((e) => {
      const key = String(e._id);
      const list = tasksByEpic[key] || [];
      return {
        ...e,
        tasks: list,
        taskCount: list.length,
      };
    });

    // 6) Lấy risks (lọc theo quyền)
    // HoOC: xem tất cả
    // HoD và Member: xem rủi ro của ban mình + rủi ro chung (scope = 'event')
    let riskQuery = { eventId };
    if ((userRole === 'HoD' || userRole === 'Member') && userDepartmentId) {
      riskQuery = {
        eventId,
        $or: [
          { scope: 'event' },
          { departmentId: userDepartmentId },
        ],
      };
    } else if (userRole === 'Member' && !userDepartmentId) {
      // Member không có ban thì chỉ xem rủi ro chung
      riskQuery = {
        eventId,
        scope: 'event',
      };
    }
    // HoOC không có filter, xem tất cả

    const risks = await Risk.find(riskQuery)
      .select('_id name risk_category impact likelihood risk_status scope departmentId risk_mitigation_plan risk_response_plan occurred_risk')
      .populate('departmentId', 'name')
      .lean();

    // 7) Lấy calendar events sắp tới (lọc theo quyền)
    // HoOC: xem tất cả
    // HoD và Member: xem lịch của ban mình + lịch chung (type = 'event')
    const now = new Date();
    let calendarQuery = {
      eventId,
      startAt: { $gte: now },
    };
    if ((userRole === 'HoD' || userRole === 'Member') && userDepartmentId) {
      calendarQuery = {
        eventId,
        startAt: { $gte: now },
        $or: [
          { type: 'event' },
          { departmentId: userDepartmentId },
        ],
      };
    } else if (userRole === 'Member' && !userDepartmentId) {
      // Member không có ban thì chỉ xem lịch chung
      calendarQuery = {
        eventId,
        startAt: { $gte: now },
        type: 'event',
      };
    }
    // HoOC không có filter, xem tất cả

    const upcomingCalendars = await Calendar.find(calendarQuery)
      .select('_id name type startAt endAt locationType location notes departmentId')
      .populate('departmentId', 'name')
      .sort({ startAt: 1 })
      .limit(20)
      .lean();

    // 8) Lấy milestones sắp tới (chỉ lấy milestones chưa qua)
    // Sử dụng biến now đã khai báo ở trên (dòng 227)
    const milestones = await Milestone.find({
      eventId,
      isDeleted: false,
      targetDate: { $gte: now }, // Chỉ lấy milestones sắp tới
    })
      .select('_id name description targetDate')
      .sort({ targetDate: 1 }) // Sắp xếp tăng dần, milestone sắp tới nhất sẽ là milestone đầu tiên
      .lean();

    // 9) Lấy thông tin ngân sách (budget) theo quyền
    let budgetFilter = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: ['submitted', 'approved', 'changes_requested', 'sent_to_members', 'locked'] }
    };

    // HoOC: xem tất cả budgets (không bao gồm draft)
    // HoD/Member: chỉ xem budget của ban mình hoặc public
    if (userRole !== 'HoOC') {
      const orConditions = [];
      if (userDepartmentId) {
        orConditions.push({ departmentId: new mongoose.Types.ObjectId(userDepartmentId) });
      }
      orConditions.push({ isPublic: true });
      budgetFilter.$or = orConditions;
    }

    const budgets = await EventBudgetPlan.find(budgetFilter)
      .select('_id name status departmentId items totalCost createdAt submittedAt')
      .populate('departmentId', 'name')
      .lean();

    // Lấy expenses cho các budgets đã được duyệt (approved, sent_to_members, locked) để tính actual
    const approvedBudgetIds = budgets
      .filter(b => ['approved', 'sent_to_members', 'locked'].includes(b.status))
      .map(b => b._id);
    
    let expensesByBudget = new Map();
    if (approvedBudgetIds.length > 0) {
      expensesByBudget = await fetchExpensesForBudgets(approvedBudgetIds);
    }

    // Tính toán thống kê ngân sách
    let totalEstimated = 0;
    let totalActual = 0;
    const budgetByDepartment = {};
    const budgetStats = {
      totalBudgets: budgets.length,
      byStatus: {
        submitted: 0,        // Chưa duyệt
        approved: 0,        // Đã duyệt
        changes_requested: 0, // Từ chối
        sent_to_members: 0,  // Đã duyệt (gửi đến thành viên)
        locked: 0           // Đã duyệt (đã khóa)
      },
      summary: {
        pending: 0,    // Chưa duyệt (submitted)
        approved: 0,  // Đã duyệt (approved + sent_to_members + locked)
        rejected: 0   // Từ chối (changes_requested)
      }
    };

    budgets.forEach(budget => {
      const deptId = budget.departmentId?._id?.toString() || budget.departmentId?.toString() || 'no_dept';
      const deptName = budget.departmentId?.name || 'Chưa có ban';
      
      if (!budgetByDepartment[deptId]) {
        budgetByDepartment[deptId] = {
          departmentId: budget.departmentId?._id || budget.departmentId,
          departmentName: deptName,
          budgets: [],
          totalEstimated: 0,
          totalActual: 0
        };
      }

      const budgetEstimated = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;

      // Tính actual amount từ expenses (chỉ cho budgets đã được duyệt)
      let budgetActual = 0;
      if (['approved', 'sent_to_members', 'locked'].includes(budget.status)) {
        const planExpenses = expensesByBudget.get(budget._id.toString()) || new Map();
        const expenseValues = Array.from(planExpenses.values());
        budgetActual = expenseValues.reduce(
          (sum, expense) => sum + decimalToNumber(expense.actualAmount),
          0
        );
      }

      totalEstimated += budgetEstimated;
      totalActual += budgetActual;
      
      budgetByDepartment[deptId].budgets.push({
        _id: budget._id,
        name: budget.name,
        status: budget.status,
        estimated: budgetEstimated,
        actual: budgetActual
      });
      budgetByDepartment[deptId].totalEstimated += budgetEstimated;
      budgetByDepartment[deptId].totalActual += budgetActual;

      // Đếm theo status
      if (budgetStats.byStatus.hasOwnProperty(budget.status)) {
        budgetStats.byStatus[budget.status]++;
      }

      // Đếm theo nhóm: chưa duyệt, đã duyệt, từ chối
      if (budget.status === 'submitted') {
        budgetStats.summary.pending++;
      } else if (['approved', 'sent_to_members', 'locked'].includes(budget.status)) {
        budgetStats.summary.approved++;
      } else if (budget.status === 'changes_requested') {
        budgetStats.summary.rejected++;
      }
    });

    return {
      event,
      currentUser: currentUserMembership ? {
        role: userRole,
        departmentId: userDepartmentId,
        departmentName: currentUserMembership.departmentId?.name,
        eventName: event.name,
      } : null,
      departments: departments.map((d) => ({
        _id: d._id,
        name: d.name,
        description: d.description,
        leaderId: d.leaderId,
        memberCount: memberCountByDept[String(d._id)] || 0,
      })),
      members: {
        total: totalMembers,
        byDepartment: memberCountByDept,
        byRole: memberCountByRole,
        detail: membersDetail, // Danh sách chi tiết từng member (đã lọc theo quyền)
      },
      epics: epicsWithTasks,
      risks: risks.map((r) => ({
        _id: r._id,
        name: r.name,
        risk_category: r.risk_category,
        impact: r.impact,
        likelihood: r.likelihood,
        risk_status: r.risk_status,
        scope: r.scope,
        departmentId: r.departmentId?._id,
        departmentName: r.departmentId?.name,
      })),
      calendars: upcomingCalendars.map((c) => ({
        _id: c._id,
        name: c.name,
        type: c.type,
        startAt: c.startAt,
        endAt: c.endAt,
        locationType: c.locationType,
        location: c.location,
        notes: c.notes,
        departmentId: c.departmentId?._id,
        departmentName: c.departmentId?.name,
      })),
      milestones: milestones.map((m) => ({
        _id: m._id,
        name: m.name,
        description: m.description,
        targetDate: m.targetDate,
      })),
      budgets: {
        totalEstimated,
        totalActual,
        totalBudgets: budgetStats.totalBudgets,
        byStatus: budgetStats.byStatus,
        summary: budgetStats.summary,
        byDepartment: Object.values(budgetByDepartment)
      },
      summary: {
        totalDepartments: departments.length,
        totalMembers,
        totalEpics: epics.length,
        totalTasks: tasks.length,
        totalRisks: risks.length,
        upcomingCalendarsCount: upcomingCalendars.length,
        totalMilestones: milestones.length,
        totalBudgetEstimated: totalEstimated,
        totalBudgets: budgetStats.totalBudgets,
      },
    };
  } catch (error) {
    console.error('[getFullEventContext] Error:', error);
    return null;
  }
};

/**
 * Format thông tin sự kiện thành context string cho AI
 */
const formatEventContextForAI = (eventData) => {
  if (!eventData) return '';

  const { event, currentUser, departments, members, epics, risks, calendars, milestones, budgets, summary } = eventData;

  const lines = [
    `Bạn đang hỗ trợ lập kế hoạch cho sự kiện "${event.name}" trong hệ thống myFEvent.`,
    `EVENT_CONTEXT_JSON: {"eventId": "${event._id}"}`,
    ``,
    `=== THÔNG TIN SỰ KIỆN ===`,
    `- Tên: ${event.name}`,
    `- Loại: ${event.type}`,
    `- Mô tả: ${event.description || 'N/A'}`,
    `- Địa điểm: ${event.location || 'N/A'}`,
    `- Thời gian: ${event.eventStartDate ? new Date(event.eventStartDate).toLocaleString('vi-VN') : 'N/A'} → ${event.eventEndDate ? new Date(event.eventEndDate).toLocaleString('vi-VN') : 'N/A'}`,
    `- Ngày bắt đầu (yyyy-mm-dd): ${event.eventStartDate ? new Date(event.eventStartDate).toISOString().split('T')[0] : 'N/A'}`,
    `- Ngày kết thúc (yyyy-mm-dd): ${event.eventEndDate ? new Date(event.eventEndDate).toISOString().split('T')[0] : 'N/A'}`,
    `- Người tổ chức: ${event.organizerName || 'N/A'}`,
    ``,
  ];

  if (currentUser) {
    lines.push(
      `=== THÔNG TIN NGƯỜI DÙNG HIỆN TẠI ===`,
      `- Vai trò: ${roleLabel(currentUser.role)}`,
      `- Ban: ${currentUser.departmentName || 'Chưa có ban'}`,
      ``,
    );
  }

  lines.push(
    `=== TỔNG QUAN ===`,
    `- Tổng số ban: ${summary.totalDepartments}`,
    `- Tổng số thành viên: ${summary.totalMembers} (Trưởng ban tổ chức: ${members.byRole.HoOC}, Trưởng ban: ${members.byRole.HoD}, Thành viên: ${members.byRole.Member})`,
    `- Tổng số công việc lớn: ${summary.totalEpics}`,
    `- Tổng số công việc: ${summary.totalTasks}`,
    `- Tổng số rủi ro: ${summary.totalRisks}`,
    `- Số lịch sắp tới: ${summary.upcomingCalendarsCount}`,
    `- Số cột mốc: ${summary.totalMilestones}`,
    `- Tổng ngân sách dự kiến: ${budgets?.totalEstimated ? budgets.totalEstimated.toLocaleString('vi-VN') : 0} VNĐ`,
    `- Tổng ngân sách thực tế: ${budgets?.totalActual ? budgets.totalActual.toLocaleString('vi-VN') : 0} VNĐ`,
    `- Tổng số đơn ngân sách: ${budgets?.totalBudgets || 0}`,
    `- Số đơn chưa duyệt: ${budgets?.summary?.pending || 0}`,
    `- Số đơn đã duyệt: ${budgets?.summary?.approved || 0}`,
    `- Số đơn từ chối: ${budgets?.summary?.rejected || 0}`,
    ``,
    `=== QUY TẮC TẠO CÔNG VIỆC ===`,
    `- BẠN ĐÃ CÓ ĐẦY ĐỦ THÔNG TIN về sự kiện "${event.name}" (eventId: ${event._id}) trong context này - KHÔNG CẦN gọi tool get_event_detail_for_ai nữa.`,
    `- Khi người dùng yêu cầu "tạo công việc" hoặc "tạo công việc lớn": tạo NGAY LẬP TỨC dựa trên thông tin đã có, không hỏi lại các câu như "ban nào", "liên quan việc gì", "mô tả gì", "ngày bắt đầu", "eventStartDate", ...`,
    `- eventStartDate đã có sẵn trong context (phần "Ngày bắt đầu (yyyy-mm-dd)") - KHÔNG hỏi lại người dùng về ngày bắt đầu sự kiện, hãy lấy trực tiếp từ context.`,
    `- Không đặt hạn chót (deadline); để trống để Trưởng ban tổ chức/Trưởng ban chỉnh sau.`,
    `- Ưu tiên gán công việc vào ban của người dùng hiện tại nếu họ thuộc một ban; nếu không có ban, tạo công việc chung của sự kiện.`,
    `- Sử dụng ngữ cảnh sự kiện hiện tại (danh sách ban, công việc lớn đã có, mô tả sự kiện, ngày bắt đầu/kết thúc) để tự suy luận và tạo công việc phù hợp, tránh hỏi thêm.`,
    ``,
    `=== QUY TẮC TRẢ LỜI VỀ NGÂN SÁCH/TÀI CHÍNH ===`,
    `- ${currentUser?.role === 'HoOC' ? 'Bạn là Trưởng ban tổ chức, có thể xem và trả lời về ngân sách của TẤT CẢ các ban trong sự kiện.' : currentUser?.role === 'HoD' ? 'Bạn là Trưởng ban, có thể xem và trả lời về ngân sách của ban mình (' + (currentUser?.departmentName || 'ban hiện tại') + ').' : 'Bạn là Thành viên, có thể xem và trả lời về ngân sách của ban mình (nếu có).'}`,
    `- Khi người dùng hỏi về "thống kê ngân sách", "ngân sách", "budget", "chi phí", "tài chính": hãy trả lời DỰA TRÊN DỮ LIỆU ĐÃ CÓ trong context này.`,
    `- ${currentUser?.role === 'HoOC' ? 'Bạn có thể liệt kê ngân sách của từng ban, tổng ngân sách, số lượng đơn ngân sách theo trạng thái (đã gửi, đã duyệt, yêu cầu chỉnh sửa, ...).' : 'Bạn chỉ có thể trả lời về ngân sách của ban mình, không được hỏi hoặc xem ngân sách của ban khác.'}`,
    `- Sử dụng thông tin ngân sách đã có trong context để trả lời chính xác, không từ chối hoặc nói "không thể cung cấp thông tin tài chính".`,
  );

  if (departments.length > 0) {
    lines.push(`=== DANH SÁCH CÁC BAN ===`);
    departments.forEach((dept, idx) => {
      lines.push(`${idx + 1}. ${dept.name}${dept.description ? `: ${dept.description}` : ''} (${dept.memberCount} thành viên)`);
    });
    lines.push(``);
  }

  // Hiển thị danh sách members chi tiết - đặc biệt quan trọng cho HoOC
  if (members.detail && members.detail.length > 0) {
    lines.push(`=== DANH SÁCH THÀNH VIÊN CHI TIẾT ===`);
    
    // Nhóm theo ban để dễ đọc
    const membersByDept = {};
    const membersNoDept = [];
    
    members.detail.forEach((m) => {
      const deptKey = m.departmentName || 'Chưa có ban';
      if (!membersByDept[deptKey]) {
        membersByDept[deptKey] = [];
      }
      membersByDept[deptKey].push(m);
    });

    // Hiển thị theo từng ban
    Object.keys(membersByDept).forEach((deptName) => {
      lines.push(`\nBan: ${deptName}`);
      membersByDept[deptName].forEach((m, idx) => {
        const emailInfo = m.userEmail ? ` - Email: ${m.userEmail}` : '';
        lines.push(`  ${idx + 1}. ${m.userName || 'N/A'} (${roleLabel(m.role)})${emailInfo}`);
      });
    });

    // Nếu là HoOC, hiển thị thêm thông tin tổng hợp
    if (currentUser && currentUser.role === 'HoOC') {
      lines.push(`\nTổng hợp:`);
      lines.push(`- Tổng số thành viên: ${members.total}`);
      lines.push(`- Trưởng ban tổ chức: ${members.byRole.HoOC} người`);
      lines.push(`- Trưởng ban: ${members.byRole.HoD} người`);
      lines.push(`- Thành viên: ${members.byRole.Member} người`);
    }
    
    lines.push(``);
  }

  if (epics.length > 0) {
    lines.push(`=== DANH SÁCH CÔNG VIỆC LỚN VÀ CÔNG VIỆC ===`);
    epics.forEach((epic, idx) => {
      const deptName = epic.departmentId?.name || 'Chưa có ban';
      lines.push(`${idx + 1}. Công việc lớn: ${epic.title} (${deptName}) - Trạng thái: ${epic.status || 'N/A'} - Số công việc: ${epic.taskCount || 0}`);
      if (epic.description) {
        lines.push(`   Mô tả: ${epic.description}`);
      }
      
      // Hiển thị danh sách tasks trong epic (nếu có)
      if (epic.tasks && epic.tasks.length > 0) {
        lines.push(`   Các công việc:`);
        epic.tasks.forEach((task, taskIdx) => {
          const priority = task.priority ? ` - Ưu tiên: ${task.priority}` : '';
          const dueDate = task.dueDate ? ` - Hạn: ${new Date(task.dueDate).toLocaleDateString('vi-VN')}` : '';
          lines.push(`     ${taskIdx + 1}. ${task.title} (${task.status || 'N/A'})${priority}${dueDate}`);
          if (task.description) {
            lines.push(`        ${task.description}`);
          }
        });
      }
    });
    lines.push(``);
  }

  if (risks.length > 0) {
    lines.push(`=== DANH SÁCH RỦI RO ===`);
    // HoOC có thể xem tất cả, nên hiển thị đầy đủ
    const risksToShow = currentUser && currentUser.role === 'HoOC' ? risks : risks.slice(0, 10);
    risksToShow.forEach((risk, idx) => {
      const deptName = risk.departmentName || (risk.scope === 'event' ? 'Sự kiện' : 'N/A');
      lines.push(`${idx + 1}. ${risk.name}`);
      lines.push(`   - Phân loại: ${risk.risk_category || 'N/A'}`);
      lines.push(`   - Trạng thái: ${risk.risk_status || 'N/A'}`);
      lines.push(`   - Phạm vi: ${deptName}`);
      lines.push(`   - Tác động: ${risk.impact || 'N/A'}`);
      lines.push(`   - Khả năng xảy ra: ${risk.likelihood || 'N/A'}`);
    });
    if (risks.length > risksToShow.length) {
      lines.push(`... và ${risks.length - risksToShow.length} rủi ro khác`);
    }
    lines.push(``);
  }

  if (calendars.length > 0) {
    lines.push(`=== LỊCH SẮP TỚI ===`);
    lines.push(`Lưu ý: Đây là lịch họp/lịch sự kiện, KHÁC với cột mốc (milestone). Khi người dùng hỏi về "cột mốc sắp tới", KHÔNG trả lời về lịch họp này.`);
    // HoOC có thể xem tất cả, nên hiển thị đầy đủ
    const calendarsToShow = currentUser && currentUser.role === 'HoOC' ? calendars : calendars.slice(0, 10);
    calendarsToShow.forEach((cal, idx) => {
      const deptName = cal.departmentName || (cal.type === 'event' ? 'Sự kiện' : 'N/A');
      const startDate = new Date(cal.startAt).toLocaleString('vi-VN');
      const endDate = cal.endAt ? new Date(cal.endAt).toLocaleString('vi-VN') : 'N/A';
      lines.push(`${idx + 1}. ${cal.name}`);
      lines.push(`   - Thời gian: ${startDate} → ${endDate}`);
      lines.push(`   - Địa điểm: ${cal.location || 'N/A'} (${cal.locationType || 'N/A'})`);
      lines.push(`   - Phạm vi: ${deptName}`);
      if (cal.notes) {
        lines.push(`   - Ghi chú: ${cal.notes}`);
      }
    });
    if (calendars.length > calendarsToShow.length) {
      lines.push(`... và ${calendars.length - calendarsToShow.length} lịch khác`);
    }
    lines.push(``);
  }

  // Hiển thị thông tin ngân sách
  if (budgets && budgets.totalBudgets > 0) {
    lines.push(`=== THỐNG KÊ NGÂN SÁCH ===`);
    lines.push(`- Tổng ngân sách dự kiến: ${budgets.totalEstimated.toLocaleString('vi-VN')} VNĐ`);
    lines.push(`- Tổng ngân sách thực tế: ${budgets.totalActual ? budgets.totalActual.toLocaleString('vi-VN') : 0} VNĐ`);
    lines.push(`- Tổng số đơn ngân sách: ${budgets.totalBudgets}`);
    lines.push(`- Số đơn chưa duyệt: ${budgets.summary?.pending || 0}`);
    lines.push(`- Số đơn đã duyệt: ${budgets.summary?.approved || 0}`);
    lines.push(`- Số đơn từ chối: ${budgets.summary?.rejected || 0}`);
    lines.push(`- Theo trạng thái chi tiết:`);
    lines.push(`  + Đã gửi (chưa duyệt): ${budgets.byStatus.submitted || 0}`);
    lines.push(`  + Đã duyệt: ${budgets.byStatus.approved || 0}`);
    lines.push(`  + Yêu cầu chỉnh sửa (từ chối): ${budgets.byStatus.changes_requested || 0}`);
    lines.push(`  + Đã gửi đến thành viên (đã duyệt): ${budgets.byStatus.sent_to_members || 0}`);
    lines.push(`  + Đã khóa (đã duyệt): ${budgets.byStatus.locked || 0}`);
    
    if (budgets.byDepartment && budgets.byDepartment.length > 0) {
      lines.push(``);
      lines.push(`- Ngân sách theo ban:`);
      budgets.byDepartment.forEach((deptBudget, idx) => {
        lines.push(`  ${idx + 1}. ${deptBudget.departmentName}: ${deptBudget.totalEstimated.toLocaleString('vi-VN')} VNĐ (${deptBudget.budgets.length} đơn)`);
        if (deptBudget.budgets.length > 0 && (currentUser?.role === 'HoOC' || (currentUser?.role === 'HoD' && currentUser?.departmentId?.toString() === deptBudget.departmentId?.toString()))) {
          deptBudget.budgets.forEach((budget, bIdx) => {
            const statusLabel = {
              'submitted': 'Đã gửi',
              'approved': 'Đã duyệt',
              'changes_requested': 'Yêu cầu chỉnh sửa',
              'sent_to_members': 'Đã gửi đến thành viên',
              'locked': 'Đã khóa'
            }[budget.status] || budget.status;
            lines.push(`     - ${budget.name}: ${budget.estimated.toLocaleString('vi-VN')} VNĐ (${statusLabel})`);
          });
        }
      });
    }
    lines.push(``);
  } else {
    lines.push(`=== THỐNG KÊ NGÂN SÁCH ===`);
    lines.push(`- Chưa có đơn ngân sách nào được tạo cho sự kiện này.`);
    lines.push(``);
  }

  if (milestones.length > 0) {
    lines.push(`=== CỘT MỐC SẮP TỚI ===`);
    lines.push(`Lưu ý: Danh sách cột mốc đã được sắp xếp theo thời gian tăng dần. Cột mốc đầu tiên (số 1) là cột mốc SẮP TỚI NHẤT.`);
    milestones.forEach((ms, idx) => {
      const targetDate = new Date(ms.targetDate).toLocaleDateString('vi-VN');
      const targetDateTime = new Date(ms.targetDate);
      const isUpcoming = idx === 0 ? ' (SẮP TỚI NHẤT)' : '';
      lines.push(`${idx + 1}. ${ms.name} - ${targetDate}${isUpcoming}`);
      if (ms.description) {
        lines.push(`   ${ms.description}`);
      }
    });
    lines.push(``);
    lines.push(`QUAN TRỌNG: Khi người dùng hỏi "cột mốc sắp tới là gì" hoặc "cột mốc sắp tới", bạn PHẢI trả lời về cột mốc ĐẦU TIÊN trong danh sách trên (cột mốc có số 1), vì đó là cột mốc sắp tới nhất. KHÔNG trả lời về các cột mốc khác hoặc lịch họp (calendar events) khi chỉ hỏi về cột mốc.`);
    lines.push(``);
  }

  lines.push(
    `=== HƯỚNG DẪN ===`,
    `- QUAN TRỌNG: eventId của sự kiện hiện tại là: ${event._id}`,
    `- Khi người dùng nói "sự kiện này" thì hiểu là eventId = ${event._id}`,
    `- Khi người dùng yêu cầu "tạo task cho sự kiện này" hoặc câu tương tự, hãy hiểu là tạo task cho eventId = ${event._id}`,
    `- Khi tạo task/epic, luôn gắn với eventId = ${event._id} (qua các tool tương ứng)`,
    `- TRƯỚC KHI tạo task/epic, BẮT BUỘC phải gọi tool get_event_detail_for_ai với eventId = "${event._id}" để lấy thông tin chi tiết`,
    `- Nếu bạn chưa gọi get_event_detail_for_ai, HÃY GỌI NGAY với eventId = "${event._id}"`,
    ``,
    `=== QUYỀN TẠO EPIC VÀ TASK ===`,
    `- Chỉ HoOC mới có quyền tạo EPIC mới`,
    `- HoOC có thể tạo TASK cho bất kỳ EPIC nào`,
    `- HoD CHỈ có thể tạo TASK trong EPIC của ban mình (KHÔNG được tạo EPIC mới)`,
    `- Member KHÔNG được phép tạo EPIC hoặc TASK`,
    `- Nếu HoD yêu cầu tạo EPIC, trả lời rằng chỉ HoOC mới có quyền tạo EPIC`,
    `- Nếu Member yêu cầu tạo EPIC/TASK, trả lời rằng chỉ HoOC và HoD mới có quyền này`,
  );

  // Thêm hướng dẫn về quyền cho HoD và Member
  if (currentUser && (currentUser.role === 'HoD' || currentUser.role === 'Member')) {
    lines.push(
      ``,
      `=== QUYỀN HẠN CHO ${currentUser.role} ===`,
    );
    
    if (currentUser.role === 'Member') {
      lines.push(
        `- Member KHÔNG được phép tạo EPIC hoặc TASK. Nếu Member yêu cầu tạo, trả lời rằng chỉ HoOC và HoD mới có quyền này.`,
        `- Member có thể xem rủi ro của ban mình (nếu có ban) + rủi ro chung (scope = 'event')`,
        `- Member có thể xem lịch của ban mình (nếu có ban) + lịch chung (type = 'event')`,
      );
    } else {
      lines.push(
        `- HoD CHỈ có thể tạo TASK trong EPIC của ban mình (KHÔNG được tạo EPIC mới)`,
        `- HoD muốn tạo EPIC phải yêu cầu HoOC tạo`,
        `- HoD có thể xem rủi ro của ban mình + rủi ro chung (scope = 'event')`,
        `- HoD có thể xem lịch của ban mình + lịch chung (type = 'event')`,
      );
    }
    
    // Quy tắc về budget đã được thêm ở phần QUY TẮC TRẢ LỜI VỀ NGÂN SÁCH/TÀI CHÍNH ở trên
  }

  // Thêm hướng dẫn đặc biệt cho HoOC
  if (currentUser && currentUser.role === 'HoOC') {
    lines.push(
      ``,
      `=== QUYỀN HẠN ĐẶC BIỆT CHO HoOC ===`,
      `- Bạn đang hỗ trợ HoOC (Head of Organizing Committee) - người có quyền cao nhất trong sự kiện`,
      `- HoOC có thể xem và truy cập TẤT CẢ thông tin về sự kiện:`,
      `  + Thông tin chi tiết của TẤT CẢ thành viên (tên, role, ban)`,
      `  + Thông tin chi tiết của TẤT CẢ các ban`,
      `  + Thông tin chi tiết của TẤT CẢ EPIC và TASK`,
      `  + Thông tin chi tiết của TẤT CẢ rủi ro (của tất cả các ban và sự kiện)`,
      `  + Thông tin chi tiết của TẤT CẢ lịch (của tất cả các ban và sự kiện)`,
      `- HoOC là người DUY NHẤT có quyền tạo EPIC mới`,
      `- HoOC có thể tạo TASK cho bất kỳ EPIC nào`,
      `- Khi HoOC hỏi về bất kỳ thông tin nào của sự kiện, bạn PHẢI trả lời đầy đủ và chi tiết dựa trên thông tin đã có trong context trên`,
      `- Nếu HoOC hỏi về thông tin cụ thể (ví dụ: "ai là HoD của ban X?", "ban Y có bao nhiêu thành viên?", "task nào đang chậm tiến độ?"), hãy tìm trong context và trả lời chính xác`,
      `- Nếu cần thông tin mới nhất, bạn có thể gọi tool get_event_detail_for_ai, nhưng thông thường context đã đủ đầy đủ`,
    );
  }

  return lines.join('\n');
};

export const runEventPlannerAgent = async (req, res) => {
  try {
    const { history_messages, eventId, sessionId: rawSessionId } = req.body || {};
    const userId = req.user?.id;

    if (!Array.isArray(history_messages)) {
      return res.status(400).json({
        message: 'history_messages phải là một mảng message {role, content}',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Thiếu Authorization header (JWT)' });
    }

    // Kiểm tra FastAPI service có sẵn sàng không (chỉ khi chạy localhost)
    if (AI_AGENT_BASE_URL.includes('localhost') || AI_AGENT_BASE_URL.includes('127.0.0.1')) {
      try {
        await axios.get(`${AI_AGENT_BASE_URL}/health`, { timeout: 5000 });
      } catch (healthError) {
        console.error('[aiAgentController] FastAPI health check failed:', healthError.message);
        return res.status(503).json({
          message: 'AI Agent service không khả dụng',
          error: {
            message: `Không thể kết nối tới FastAPI service tại ${AI_AGENT_BASE_URL}`,
            suggestion: 'Đảm bảo FastAPI service đang chạy. Chạy lệnh: cd myFEvent-agent-main && python -m uvicorn app:app --host 0.0.0.0 --port 9000',
          },
        });
      }
    }

    // Tăng cường ngữ cảnh: nếu có eventId thì lấy thông tin đầy đủ của sự kiện
    let enrichedMessages = [...history_messages];
    if (eventId && userId) {
      try {
        // Lấy thông tin đầy đủ của sự kiện (departments, members, epics, tasks, risks, calendars, milestones)
        const eventData = await getFullEventContext(eventId, userId);
        
        if (eventData) {
          const contextLines = formatEventContextForAI(eventData);
          
          // Chỉ thêm system message nếu đây là lần đầu tiên (không có system message trong history)
          const hasSystemMessage = history_messages.some(msg => msg.role === 'system');
          
          if (!hasSystemMessage) {
            // Lần đầu tiên: thêm system message với đầy đủ thông tin
            enrichedMessages = [
              { role: 'system', content: contextLines },
              ...history_messages,
            ];
          } else {
            // Đã có system message: chỉ cập nhật nếu cần (hoặc giữ nguyên để tránh làm dài context)
            // Có thể bỏ qua hoặc chỉ thêm vào message đầu tiên nếu cần
            console.log('[aiAgentController] System message already exists, keeping existing context');
          }
        } else {
          // Fallback: nếu không lấy được thông tin đầy đủ, dùng thông tin cơ bản
          console.warn(`[aiAgentController] getFullEventContext returned null for eventId=${eventId}, userId=${userId}, using fallback`);
          const event = await Event.findById(eventId).lean();
          if (event) {
            const contextLines = [
            `Bạn đang hỗ trợ lập kế hoạch cho sự kiện "${event.name}" trong hệ thống myFEvent.`,
            `QUAN TRỌNG: eventId của sự kiện hiện tại là: ${eventId}`,
            `EVENT_CONTEXT_JSON: {"eventId": "${eventId}"}`,
            ``,
            `=== THÔNG TIN SỰ KIỆN ===`,
            `- Tên: ${event.name}`,
            `- Loại: ${event.type}`,
            `- Mô tả: ${event.description || 'N/A'}`,
            `- Địa điểm: ${event.location || 'N/A'}`,
            `- Thời gian: ${event.eventStartDate ? new Date(event.eventStartDate).toLocaleString('vi-VN') : 'N/A'} → ${event.eventEndDate ? new Date(event.eventEndDate).toLocaleString('vi-VN') : 'N/A'}`,
            `- Ngày bắt đầu (yyyy-mm-dd): ${event.eventStartDate ? new Date(event.eventStartDate).toISOString().split('T')[0] : 'N/A'}`,
            `- Ngày kết thúc (yyyy-mm-dd): ${event.eventEndDate ? new Date(event.eventEndDate).toISOString().split('T')[0] : 'N/A'}`,
            `- Người tổ chức: ${event.organizerName || 'N/A'}`,
            ``,
            `HƯỚNG DẪN QUAN TRỌNG:`,
            `- Bạn đã có đầy đủ thông tin về sự kiện "${event.name}" (eventId: ${eventId}) trong context này`,
            `- eventStartDate đã có sẵn trong context (phần "Ngày bắt đầu (yyyy-mm-dd)") - KHÔNG hỏi lại người dùng về ngày bắt đầu sự kiện, hãy lấy trực tiếp từ context.`,
            `- Khi người dùng yêu cầu "tạo công việc" hoặc "tạo công việc lớn", hãy tạo NGAY LẬP TỨC dựa trên thông tin sự kiện đã có`,
            `- KHÔNG hỏi lại người dùng về ban nào, việc gì, mô tả gì, ngày bắt đầu - hãy tự suy luận từ thông tin sự kiện và tạo công việc phù hợp`,
            `- KHÔNG đặt deadline cho công việc - để trống để Trưởng ban tổ chức hoặc Trưởng ban chỉnh sau`,
            `- Ưu tiên gán công việc vào ban của người dùng hiện tại (nếu có), nếu không có ban thì để công việc chung của sự kiện`,
            `- Khi tạo công việc/công việc lớn, luôn gắn với eventId = ${eventId} (qua các tool tương ứng)`,
            `- Nếu cần thông tin chi tiết hơn về ban, thành viên, công việc lớn hiện có, bạn có thể gọi tool get_event_detail_for_ai với eventId = "${eventId}"`,
            `- NHƯNG nếu đã có đủ thông tin để tạo công việc, hãy tạo ngay mà không cần gọi tool`,
          ].join('\n');

            const hasSystemMessage = history_messages.some(msg => msg.role === 'system');
            if (!hasSystemMessage) {
          enrichedMessages = [
            { role: 'system', content: contextLines },
            ...history_messages,
          ];
            }
          }
        }
      } catch (e) {
        // Không chặn toàn bộ flow nếu lỗi đọc DB
        console.warn('runEventPlannerAgent: lỗi load event context', e);
      }
    } else if (eventId && !userId) {
      // Có eventId nhưng không có userId (có thể là lần đầu, chưa đăng nhập)
      // Vẫn thêm context cơ bản
      try {
        const event = await Event.findById(eventId).lean();
        if (event) {
          const contextLines = [
            `Bạn đang hỗ trợ lập kế hoạch cho một sự kiện trong hệ thống myFEvent.`,
            `QUAN TRỌNG: eventId của sự kiện hiện tại là: ${eventId}`,
            `EVENT_CONTEXT_JSON: {"eventId": "${eventId}"}`,
            `Thông tin sự kiện cơ bản:`,
            `- Tên: ${event.name}`,
            `- Loại: ${event.type}`,
            `- Địa điểm: ${event.location || 'N/A'}`,
            `- Thời gian: ${event.eventStartDate || 'N/A'} → ${event.eventEndDate || 'N/A'}`,
            ``,
            `HƯỚNG DẪN QUAN TRỌNG:`,
            `- Bạn đã có thông tin cơ bản về sự kiện "${event.name}" (eventId: ${eventId}) trong context này`,
            `- Khi người dùng yêu cầu "tạo công việc" hoặc "tạo công việc lớn", hãy tạo NGAY LẬP TỨC dựa trên thông tin sự kiện đã có`,
            `- KHÔNG hỏi lại người dùng về ban nào, việc gì, mô tả gì - hãy tự suy luận từ thông tin sự kiện và tạo công việc phù hợp`,
            `- KHÔNG đặt deadline cho công việc - để trống để Trưởng ban tổ chức hoặc Trưởng ban chỉnh sau`,
            `- Nếu cần thông tin chi tiết hơn về ban, thành viên, công việc lớn hiện có, bạn có thể gọi tool get_event_detail_for_ai với eventId = "${eventId}"`,
            `- NHƯNG nếu đã có đủ thông tin để tạo công việc, hãy tạo ngay mà không cần gọi tool`,
            `- Khi tạo công việc/công việc lớn, luôn gắn với eventId = ${eventId} (qua các tool tương ứng)`,
          ].join('\n');

          const hasSystemMessage = history_messages.some(msg => msg.role === 'system');
          if (!hasSystemMessage) {
            enrichedMessages = [
              { role: 'system', content: contextLines },
              ...history_messages,
            ];
          }
        }
      } catch (e) {
        console.warn('runEventPlannerAgent: lỗi load basic event context', e);
      }
    }

    const apiUrl = `${AI_AGENT_BASE_URL}/agent/event-planner/turn`;

    // Log thời gian bắt đầu request
    const startTime = Date.now();
    console.log(`[runEventPlannerAgent] Bắt đầu gọi AI agent tại ${new Date().toISOString()}, timeout: 300s`);

    // Gửi eventId trong request để Python agent có thể trả về và lưu lịch sử đúng cách
    const pythonRes = await axios.post(
      apiUrl,
      { 
        history_messages: enrichedMessages,
        eventId: eventId || null, // Gửi eventId (có thể null khi ngoài sự kiện)
        backend_base_url: BACKEND_BASE_URL, // Thêm dòng này để Python agent biết backend URL
      },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 300_000, // 300 giây (5 phút) - tăng timeout để đủ thời gian cho AI tạo công việc lớn và công việc con
      }
    );

    // Log thời gian hoàn thành request
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[runEventPlannerAgent] Hoàn thành gọi AI agent sau ${duration}s`);

    const agentData = pythonRes.data || {};
    const assistantReply = agentData.assistant_reply || '';

    // Xác định sessionId cho cuộc trò chuyện hiện tại
    const sessionId =
      rawSessionId ||
      agentData.sessionId ||
      agentData.session_id ||
      `agent-${Date.now()}`;

    // Lưu lịch sử vào ConversationHistory (giống ChatGPT-style)
    // Lưu cả khi có eventId (trong sự kiện) và khi không có eventId (ngoài sự kiện)
    if (userId) {
      try {
        // Tìm conversation với điều kiện: userId, sessionId, channel và eventId (có thể null)
        const query = {
          userId,
          sessionId,
          channel: CHANNEL_AGENT,
        };
        // Nếu có eventId thì tìm theo eventId, nếu không thì tìm với eventId = null
        if (eventId) {
          query.eventId = eventId;
        } else {
          query.eventId = null; // Hoặc { $exists: false } nếu muốn tìm cả null và không có field
        }
        
        let conversation = await ConversationHistory.findOne(query);

        if (!conversation) {
          conversation = new ConversationHistory({
            userId,
            eventId: eventId || null, // Cho phép null khi ngoài sự kiện
            sessionId,
            channel: CHANNEL_AGENT,
            messages: [],
          });
        }

        // Lấy user message cuối cùng từ history_messages (bỏ qua system messages)
        const userMessages = history_messages.filter((m) => m.role === 'user');
        const lastUser = userMessages[userMessages.length - 1];
        
        // Kiểm tra xem user message cuối cùng đã được lưu chưa (tránh duplicate)
        const lastSavedUserMsg = [...conversation.messages]
          .reverse()
          .find((m) => m.role === 'user');
        const isNewUserMessage = !lastSavedUserMsg || 
          lastSavedUserMsg.content !== lastUser?.content;

        // Thêm user message cuối cùng nếu là message mới
        if (lastUser && isNewUserMessage) {
          conversation.messages.push({
            role: 'user',
            content: lastUser.content,
            timestamp: new Date(),
          });
        }

        // Thêm assistant reply (luôn thêm vì đây là response mới)
        if (assistantReply) {
          const plans = Array.isArray(agentData.plans) ? agentData.plans : [];
          conversation.messages.push({
            role: 'assistant',
            content: assistantReply,
            timestamp: new Date(),
            data: plans.length > 0 ? { plans } : undefined, // Lưu plans vào message data
          });
        }

        // Gán title nếu chưa có hoặc cập nhật nếu title rỗng/không hợp lệ
        const firstUser =
          conversation.messages.find((m) => m.role === 'user') || lastUser;
        if (firstUser && firstUser.content) {
          const newTitle = generateTitleFromText(firstUser.content);
          // Cập nhật title nếu chưa có hoặc nếu title hiện tại không hợp lệ
          if (!conversation.title ||
              conversation.title.trim() === '' ||
              conversation.title === 'Cuộc trò chuyện mới' ||
              conversation.title.length < 3) {
            conversation.title = newTitle;
          }
        }

        conversation.updatedAt = new Date();
        await conversation.save();
      } catch (e) {
        console.error('runEventPlannerAgent: lỗi lưu ConversationHistory', e);
      }
    }

    // Bao luôn sessionId trong response cho FE
    return res.status(200).json({
      ...agentData,
      sessionId,
    });
  } catch (err) {
    console.error('[aiAgentController] runEventPlannerAgent error:', {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      code: err.code,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        baseURL: err.config?.baseURL,
      },
    });

    const status = err.response?.status || 500;
    const errorData = err.response?.data || { message: err.message };

    // Nếu là lỗi timeout hoặc ECONNABORTED (request bị abort do timeout)
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return res.status(504).json({
        message: 'AI Agent đang xử lý quá lâu. Vui lòng thử lại sau hoặc chia nhỏ yêu cầu.',
        error: {
          code: err.code || 'ETIMEDOUT',
          message: err.message || 'Request timeout',
          suggestion: 'AI đang tạo nhiều công việc, có thể mất thời gian. Vui lòng thử lại hoặc yêu cầu tạo từng phần một (ví dụ: "tạo công việc lớn" trước, sau đó "tạo công việc con").',
          timeout: '300 giây (5 phút)',
        },
      });
    }

    // Nếu là lỗi connection reset (ECONNRESET) - AI agent có thể bị crash hoặc mất kết nối
    if (err.code === 'ECONNRESET') {
      return res.status(503).json({
        message: 'Kết nối tới AI Agent bị ngắt. Có thể AI Agent đang xử lý quá tải hoặc gặp sự cố.',
        error: {
          code: err.code,
          message: err.message,
          suggestion: 'Vui lòng thử lại sau vài giây. Nếu vẫn lỗi, có thể AI Agent service đang gặp sự cố. Vui lòng liên hệ admin.',
        },
      });
    }

    // Nếu là lỗi kết nối (ECONNREFUSED, ENOTFOUND, etc.)
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'Không thể kết nối tới AI Agent service. Vui lòng kiểm tra cấu hình AI_AGENT_BASE_URL.',
        error: {
          code: err.code,
          message: err.message,
          suggestion: `Đảm bảo AI Agent service đang chạy tại: ${AI_AGENT_BASE_URL}`,
        },
      });
    }

    // Trả về error message chi tiết hơn để frontend có thể hiển thị
    const errorMessage = errorData?.detail || errorData?.message || err.message || 'Unknown error';
    
    return res.status(status).json({
      message: 'Agent call failed',
      error: {
        ...errorData,
        message: errorMessage,
        originalError: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
  }
};

/**
 * POST /api/ai-agent/event-planner/apply-plan
 * Nhận danh sách "plans" từ FE (epics_plan, tasks_plan, ...) và áp dụng vào hệ thống.
 * Plan được sinh từ Python agent (tools/epics.py, tools/tasks.py) – không còn auto-apply.
 */
export const applyEventPlannerPlan = async (req, res) => {
  try {
    const { plans, eventId: bodyEventId, sessionId: bodySessionId } = req.body || {};
    const userId = req.user?.id;

    if (!Array.isArray(plans) || plans.length === 0) {
      return res
        .status(400)
        .json({ message: 'plans phải là một mảng và không được rỗng' });
    }

    // Log để debug cấu trúc plans
    console.log(`[applyEventPlannerPlan] Nhận được ${plans.length} plans:`, plans.map(p => ({
      type: p?.type,
      department: p?.department,
      epicTitle: p?.epicTitle,
      epicId: p?.epicId,
      hasPlan: !!p?.plan,
      epicsCount: Array.isArray(p?.plan?.epics) ? p.plan.epics.length : 0,
      tasksCount: Array.isArray(p?.plan?.tasks) ? p.plan.tasks.length : 0,
      planKeys: p?.plan ? Object.keys(p.plan) : [],
    })));
    
    // Validate plans format
    const validPlanTypes = ['epics_plan', 'tasks_plan'];
    const invalidPlans = plans.filter(p => !p?.type || !validPlanTypes.includes(p.type));
    if (invalidPlans.length > 0) {
      console.warn(`[applyEventPlannerPlan] Có ${invalidPlans.length} plans không hợp lệ:`, invalidPlans.map(p => ({
        type: p?.type,
        hasPlan: !!p?.plan,
      })));
      summary.errors.push(`Có ${invalidPlans.length} plans không hợp lệ (thiếu type hoặc type không đúng). Các type hợp lệ: ${validPlanTypes.join(', ')}`);
    }

    // eventId có thể nằm trong body hoặc từng plan
    const eventId =
      bodyEventId ||
      plans.find((p) => p?.eventId)?.eventId ||
      null;

    if (!eventId) {
      return res.status(400).json({ message: 'Thiếu eventId trong request' });
    }

    const sessionId = bodySessionId || null;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Thiếu Authorization header (JWT)' });
    }

    // Kiểm tra quyền của user trước khi apply
    let userRole = null;
    let userDepartmentId = null;
    if (userId && eventId) {
      try {
        const membership = await EventMember.findOne({
          eventId,
          userId,
          status: { $ne: 'deactive' },
        })
          .select('role departmentId')
          .lean();
        
        if (membership) {
          userRole = membership.role;
          userDepartmentId = membership.departmentId ? String(membership.departmentId) : null;
          console.log(`[applyEventPlannerPlan] User role: ${userRole}, departmentId: ${userDepartmentId}`);
        }
      } catch (e) {
        console.warn('[applyEventPlannerPlan] Không thể kiểm tra quyền user', e);
      }
    }

    // Kiểm tra nếu HoD cố tạo EPIC
    const hasEpicsPlan = plans.some(p => p?.type === 'epics_plan');
    const hasTasksPlan = plans.some(p => p?.type === 'tasks_plan');
    
    if (hasEpicsPlan && userRole === 'HoD') {
      return res.status(403).json({
        message: 'Bạn là Trưởng ban (HoD), không thể tạo công việc lớn (EPIC). Chỉ Trưởng ban tổ chức (HoOC) mới có quyền tạo công việc lớn.',
        summary: {
          epicsRequests: 0,
          taskRequests: 0,
          epicsCreated: 0,
          tasksCreated: 0,
          errors: ['HoD không thể tạo EPIC. Vui lòng yêu cầu HoOC tạo công việc lớn trước, sau đó bạn có thể tạo công việc con (TASK) cho công việc lớn đó.'],
        },
      });
    }
    
    // Kiểm tra nếu có tasks_plan nhưng không có epics_plan và user là HoD
    // HoD có thể tạo tasks cho EPIC đã tồn tại, nhưng cần EPIC tồn tại trước
    if (hasTasksPlan && !hasEpicsPlan && userRole === 'HoD') {
      console.log(`[applyEventPlannerPlan] HoD đang cố tạo tasks nhưng không có epics_plan. Sẽ thử tìm EPIC đã tồn tại trong database.`);
    }

    const summary = {
      epicsRequests: 0,
      taskRequests: 0,
      epicsCreated: 0,
      tasksCreated: 0,
      errors: [],
    };

    // Map để lưu epicId mới được tạo: key = "department:epicTitle" -> epicId
    const epicIdMap = new Map();
    // Map để lưu danh sách epicIds theo department (để xử lý trường hợp nhiều EPIC cùng department)
    const deptToEpicIdsMap = new Map(); // key = department -> Set<epicId>

    // BƯỚC 1: Tạo tất cả EPIC trước (chỉ HoOC mới vào được đây)
    for (const rawPlan of plans) {
      if (!rawPlan || typeof rawPlan !== 'object') continue;
      if (rawPlan.type !== 'epics_plan') continue;

      summary.epicsRequests += 1;
      const planEventId = rawPlan.eventId || eventId;
      const epicsPlan = rawPlan.plan || {};
      const epics = Array.isArray(epicsPlan.epics)
        ? epicsPlan.epics
        : [];
      
      if (!epics.length) {
        console.warn(`[applyEventPlannerPlan] epics_plan không có epics nào. Plan:`, {
          type: rawPlan.type,
          department: rawPlan.department,
          hasPlan: !!rawPlan.plan,
          planKeys: rawPlan.plan ? Object.keys(rawPlan.plan) : [],
        });
        summary.errors.push(`epics_plan không có epics nào để tạo.`);
        continue;
      }
      
      console.log(`[applyEventPlannerPlan] Xử lý epics_plan với ${epics.length} epics, department: "${rawPlan.department || 'N/A'}"`);

      try {
        const apiUrl = `${SELF_BASE_URL}/api/events/${planEventId}/epics/ai-bulk-create`;
        console.log(`[applyEventPlannerPlan] Gọi API tạo EPIC: ${apiUrl}`);
        console.log(`[applyEventPlannerPlan] Số lượng EPIC cần tạo: ${epics.length}`);
        console.log(`[applyEventPlannerPlan] User ID: ${userId}, Event ID: ${planEventId}`);
        
        const resp = await axios.post(
          apiUrl,
          { epics },
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            timeout: 120_000,
          }
        );
        const respData = resp?.data || {};
        const createdEpics = Array.isArray(respData.data) ? respData.data : [];
        
        // Kiểm tra response status
        if (resp.status !== 201) {
          console.warn(`[applyEventPlannerPlan] Response status không phải 201: ${resp.status}`, respData);
        }
        
        summary.epicsCreated += createdEpics.length;
        
        // Log chi tiết để debug
        console.log(`[applyEventPlannerPlan] Đã tạo ${createdEpics.length} EPIC cho eventId=${planEventId}`);
        if (createdEpics.length > 0) {
          console.log(`[applyEventPlannerPlan] EPIC IDs: ${createdEpics.map(e => e._id || e.id).join(', ')}`);
          console.log(`[applyEventPlannerPlan] EPIC Titles: ${createdEpics.map(e => e.title).join(', ')}`);
        } else {
          console.warn(`[applyEventPlannerPlan] Không có EPIC nào được tạo! Response:`, JSON.stringify(respData, null, 2));
        }
        // Kiểm tra nếu có lỗi 403 (không có quyền)
        if (resp.status === 403) {
          const errorMsg = respData.message || 'Không có quyền tạo EPIC';
          console.error(`[applyEventPlannerPlan] Lỗi quyền khi tạo EPIC: ${errorMsg}`);
          summary.errors.push(`Lỗi quyền: ${errorMsg}. Chỉ HoOC mới được tạo EPIC.`);
          // Nếu không có quyền tạo EPIC, không thể tiếp tục với tasks_plan
          // Vì tasks_plan cần EPIC đã tồn tại
          continue;
        }
        
        if (respData.errors && respData.errors.length > 0) {
          console.warn(`[applyEventPlannerPlan] Có ${respData.errors.length} lỗi khi tạo EPIC:`, respData.errors);
          summary.errors.push(...respData.errors.map(e => `EPIC creation error: ${e}`));
        }

        // Lưu mapping: department + epicTitle -> epicId mới
        // Sử dụng thông tin từ epics array ban đầu để map
        createdEpics.forEach((epic, index) => {
          if (!epic) {
            console.warn(`[applyEventPlannerPlan] Epic tại index ${index} là null/undefined`);
            return;
          }

          // Đảm bảo epicId được convert sang string (xử lý cả _id và id)
          const epicId = epic._id || epic.id;
          if (!epicId) {
            console.warn(`[applyEventPlannerPlan] Epic tại index ${index} không có _id hoặc id`, epic);
            return;
          }
          const epicIdStr = String(epicId);

          // Lấy thông tin từ epic ban đầu (epics[index]) vì response có thể không có departmentId.name
          const originalEpic = epics[index];
          if (!originalEpic) {
            console.warn(`[applyEventPlannerPlan] originalEpic tại index ${index} không tồn tại`);
            return;
          }

          const deptName = (originalEpic?.department || '').trim();
          if (!deptName) {
            console.warn(`[applyEventPlannerPlan] Epic tại index ${index} không có department`, originalEpic);
            return;
          }

          // Ưu tiên epic.title từ response (đã được DB validate), fallback về originalEpic.title
          const epicTitle = (epic.title || originalEpic?.title || '').trim();
          if (!epicTitle) {
            console.warn(`[applyEventPlannerPlan] Epic tại index ${index} không có title`, { epic, originalEpic });
            return;
          }

          // Tạo key để map: "department:epicTitle"
          // Normalize: lowercase, trim, và loại bỏ khoảng trắng thừa
          const normalizedDeptName = deptName.toLowerCase().trim().replace(/\s+/g, ' ');
          const normalizedEpicTitle = epicTitle.toLowerCase().trim().replace(/\s+/g, ' ');
          const key1 = `${normalizedDeptName}:${normalizedEpicTitle}`;
          const key2 = normalizedDeptName;

          // Luôn set key1 (department:epicTitle) để map chính xác
          epicIdMap.set(key1, epicIdStr);
          console.log(`[applyEventPlannerPlan] Đã lưu vào epicIdMap: key="${key1}" -> epicId="${epicIdStr}"`);

          // Lưu vào map department -> Set<epicId> để xử lý trường hợp nhiều EPIC cùng department
          if (!deptToEpicIdsMap.has(key2)) {
            deptToEpicIdsMap.set(key2, new Set());
          }
          deptToEpicIdsMap.get(key2).add(epicIdStr);
        });
      } catch (e) {
        console.error('applyEventPlannerPlan: apply epics failed', {
          error: e?.message,
          response: e?.response?.data,
          status: e?.response?.status,
          stack: e?.stack,
        });
        const errorMsg = e?.response?.data?.message || e?.message || 'Unknown error';
        summary.errors.push(
          `Lỗi áp dụng EPIC plan cho eventId=${planEventId}: ${errorMsg}`
        );
        
        // Nếu là lỗi network hoặc timeout, thêm thông tin chi tiết
        if (e?.code === 'ECONNREFUSED' || e?.code === 'ETIMEDOUT') {
          summary.errors.push(`Không thể kết nối tới API tạo EPIC. Kiểm tra SELF_BASE_URL: ${SELF_BASE_URL}`);
        }
      }
    }

    // BƯỚC 2: Tạo TASK, map epicId từ EPIC vừa tạo
    console.log(`[applyEventPlannerPlan] Bắt đầu xử lý tasks_plan. Tổng số plans: ${plans.length}`);
    console.log(`[applyEventPlannerPlan] epicIdMap có ${epicIdMap.size} entries:`, Array.from(epicIdMap.entries()).map(([k, v]) => `${k} -> ${v}`));
    
    // Kiểm tra số lượng tasks_plan so với số lượng epic đã tạo
    const tasksPlansCount = plans.filter(p => p?.type === 'tasks_plan').length;
    const epicsCreatedCount = summary.epicsCreated;
    if (epicsCreatedCount > 0 && tasksPlansCount < epicsCreatedCount) {
      console.warn(`[applyEventPlannerPlan] ⚠️ Có ${epicsCreatedCount} EPIC đã được tạo nhưng chỉ có ${tasksPlansCount} tasks_plan. Có thể AI Agent chưa gen đủ tasks_plan cho tất cả epics.`);
      summary.errors.push(
        `Cảnh báo: Có ${epicsCreatedCount} công việc lớn nhưng chỉ có ${tasksPlansCount} kế hoạch công việc con. ` +
        `Một số công việc lớn có thể không có công việc con được tạo. ` +
        `Vui lòng kiểm tra lại hoặc yêu cầu AI tạo thêm công việc con cho các công việc lớn còn thiếu.`
      );
    }
    
    for (const rawPlan of plans) {
      if (!rawPlan || typeof rawPlan !== 'object') {
        console.warn('[applyEventPlannerPlan] Bỏ qua plan không hợp lệ:', rawPlan);
        continue;
      }
      
      console.log(`[applyEventPlannerPlan] Đang xử lý plan type="${rawPlan.type}", department="${rawPlan.department}", epicTitle="${rawPlan.epicTitle}"`);
      
      if (rawPlan.type !== 'tasks_plan') {
        console.log(`[applyEventPlannerPlan] Bỏ qua plan type="${rawPlan.type}" (không phải tasks_plan)`);
        continue;
      }

      summary.taskRequests += 1;
      const planEventId = rawPlan.eventId || eventId;
      let epicId = rawPlan.epicId;
      const tasksPlan = rawPlan.plan || {};
      const tasks = Array.isArray(tasksPlan.tasks)
        ? tasksPlan.tasks
        : [];
      
      console.log(`[applyEventPlannerPlan] tasks_plan có ${tasks.length} tasks, epicId từ plan: ${epicId}, department: "${rawPlan.department}", epicTitle: "${rawPlan.epicTitle}"`);
      console.log(`[applyEventPlannerPlan] Chi tiết tasks_plan:`, {
        type: rawPlan.type,
        department: rawPlan.department,
        epicTitle: rawPlan.epicTitle,
        epicId: rawPlan.epicId,
        hasPlan: !!rawPlan.plan,
        planKeys: rawPlan.plan ? Object.keys(rawPlan.plan) : [],
        tasksCount: tasks.length,
        tasksPreview: tasks.slice(0, 3).map(t => ({ title: t.title, description: t.description?.substring(0, 50) })),
      });
      
      if (!tasks.length) {
        console.warn('[applyEventPlannerPlan] tasks_plan không có tasks nào, bỏ qua. Plan:', {
          type: rawPlan.type,
          department: rawPlan.department,
          epicTitle: rawPlan.epicTitle,
          hasPlan: !!rawPlan.plan,
          planKeys: rawPlan.plan ? Object.keys(rawPlan.plan) : [],
          planContent: JSON.stringify(rawPlan.plan, null, 2),
        });
        summary.errors.push(`tasks_plan không có tasks nào để tạo (department: "${rawPlan.department || 'N/A'}", epicTitle: "${rawPlan.epicTitle || 'N/A'}").`);
        continue;
      }

      // Nếu không có epicId hoặc epicId không hợp lệ format, thử tìm từ map
      if (!epicId || !epicId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        const deptName = (rawPlan.department || '').trim();
        const epicTitle = (rawPlan.epicTitle || '').trim();

        if (!deptName) {
          summary.errors.push(
            `tasks_plan thiếu department, không thể map EPIC. epicTitle="${epicTitle}"`
          );
          continue;
        }

        // Normalize: lowercase, trim, và loại bỏ khoảng trắng thừa (giống như khi tạo EPIC)
        const normalizedDeptName = deptName.toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedEpicTitle = epicTitle.toLowerCase().trim().replace(/\s+/g, ' ');
        const key1 = `${normalizedDeptName}:${normalizedEpicTitle}`;
        const key2 = normalizedDeptName;

        console.log(`[applyEventPlannerPlan] Tìm EPIC với key="${key1}" (department="${deptName}", epicTitle="${epicTitle}")`);
        console.log(`[applyEventPlannerPlan] Các keys có trong epicIdMap:`, Array.from(epicIdMap.keys()));

        // Thử tìm từ map: ưu tiên key1 (department:epicTitle)
        epicId = epicIdMap.get(key1);
        
        if (epicId) {
          console.log(`[applyEventPlannerPlan] ✅ Tìm thấy EPIC trong map: key="${key1}" -> epicId="${epicId}"`);
        } else {
          console.log(`[applyEventPlannerPlan] ❌ Không tìm thấy EPIC trong map với key="${key1}"`);
        }

        // Nếu không tìm thấy trong map, thử tìm EPIC mới nhất được tạo trong lần apply này (nếu chỉ có 1 EPIC trong department)
        if (!epicId && epicTitle && planEventId) {
          // Thử tìm EPIC mới nhất trong department từ epicIdMap (nếu chỉ có 1 EPIC)
          const epicIdsForDept = deptToEpicIdsMap.get(key2);
          if (epicIdsForDept && epicIdsForDept.size === 1) {
            epicId = Array.from(epicIdsForDept)[0];
            console.log(`[applyEventPlannerPlan] Sử dụng EPIC mới nhất trong department từ map: ${epicId} (vì chỉ có 1 EPIC trong department "${deptName}")`);
            // Lưu vào map với key hiện tại để dùng cho lần sau
            epicIdMap.set(key1, String(epicId));
          } else if (epicIdsForDept && epicIdsForDept.size > 1) {
            // ❗ Nếu có nhiều EPIC cùng department, KHÔNG tự động chọn - yêu cầu epicTitle chính xác
            console.warn(`[applyEventPlannerPlan] Có ${epicIdsForDept.size} EPIC trong department "${deptName}", không thể tự động map. Cần epicTitle chính xác để map tasks_plan.`);
            console.warn(`[applyEventPlannerPlan] EpicTitle hiện tại: "${epicTitle}"`);
            console.warn(`[applyEventPlannerPlan] Các EPIC trong department:`, Array.from(epicIdsForDept));
            // Không báo lỗi ngay, tiếp tục tìm trong database với epicTitle
          }
        }

        // Nếu vẫn không tìm thấy, thử tìm EPIC đã tồn tại trong database
        if (!epicId && epicTitle && planEventId) {
          try {
            // Tìm department ID từ tên department
            const department = await Department.findOne({
              eventId: planEventId,
              name: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            }).lean();

            if (department) {
              // Tìm EPIC với title và departmentId (exact match hoặc contains)
              let existingEpic = await Task.findOne({
                eventId: planEventId,
                taskType: 'epic',
                title: { $regex: new RegExp(epicTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                departmentId: department._id,
              }).lean();

              // Nếu không tìm thấy exact match, KHÔNG tự động match với EPIC khác
              // Vì có thể dẫn đến match sai (ví dụ: "chuẩn bị đồ ăn" match với "truyền thông")
              // Thay vào đó, sẽ tự động tạo EPIC mới nếu là HoOC (xử lý ở phần sau)
              if (!existingEpic) {
                console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}" trong database. Sẽ tự động tạo EPIC mới nếu là HoOC.`);
              }

              // Nếu vẫn không tìm thấy, thử lấy EPIC mới nhất trong department (CHỈ KHI có đúng 1 EPIC)
              // Không fallback khi có nhiều EPIC vì có thể map sai
              if (!existingEpic) {
                const allEpicsInDept = await Task.find({
                  eventId: planEventId,
                  taskType: 'epic',
                  departmentId: department._id,
                }).sort({ createdAt: -1 }).lean();
                
                if (allEpicsInDept.length === 1) {
                  existingEpic = allEpicsInDept[0];
                  console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}", sử dụng EPIC mới nhất trong department: ${existingEpic.title} (vì chỉ có 1 EPIC)`);
                } else if (allEpicsInDept.length > 1) {
                  console.warn(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}" trong department "${deptName}". Department này có ${allEpicsInDept.length} EPIC, không thể tự động map. Cần epicTitle chính xác.`);
                }
              }

              if (existingEpic) {
                epicId = existingEpic._id;
                console.log(`[applyEventPlannerPlan] Tìm thấy EPIC đã tồn tại trong database: ${epicId} (title: "${existingEpic.title}", department: "${deptName}")`);
                // Lưu vào map để dùng cho các tasks_plan khác (key1 đã được normalize ở trên)
                epicIdMap.set(key1, String(epicId));
                console.log(`[applyEventPlannerPlan] Đã lưu vào epicIdMap: key="${key1}" -> epicId="${epicId}"`);
                if (!deptToEpicIdsMap.has(key2)) {
                  deptToEpicIdsMap.set(key2, new Set());
                }
                deptToEpicIdsMap.get(key2).add(String(epicId));
              }
            }
          } catch (dbError) {
            console.warn(`[applyEventPlannerPlan] Lỗi khi tìm EPIC trong database:`, dbError);
          }
        }

        // Nếu vẫn không tìm thấy bằng key1 và có epicTitle, tự động tạo EPIC mới (nếu là HoOC)
        if (!epicId && epicTitle && deptName) {
          const availableKeys = Array.from(epicIdMap.keys()).filter(k => k.startsWith(key2 + ':'));
          
          // Nếu là HoOC, tự động tạo EPIC mới
          if (userRole === 'HoOC') {
            try {
              console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}", tự động tạo EPIC mới cho department="${deptName}"`);
              
              // Tìm department
              const department = await Department.findOne({
                eventId: planEventId,
                name: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
              }).lean();

              if (!department) {
                summary.errors.push(
                  `Không tìm thấy department "${deptName}" trong event này. Không thể tạo EPIC tự động.`
                );
                continue;
              }

              // Tạo EPIC mới
              const newEpic = await Task.create({
                title: epicTitle,
                description: `EPIC được tạo tự động từ tasks_plan`,
                eventId: planEventId,
                departmentId: department._id,
                parentId: null,
                assigneeId: null,
                status: 'chua_bat_dau',
                taskType: 'epic',
                createdBy: userId,
              });

              epicId = newEpic._id;
              console.log(`[applyEventPlannerPlan] Đã tạo EPIC mới: ${epicId} (title: "${epicTitle}", department: "${deptName}")`);
              
              // Lưu vào map
              epicIdMap.set(key1, String(epicId));
              if (!deptToEpicIdsMap.has(key2)) {
                deptToEpicIdsMap.set(key2, new Set());
              }
              deptToEpicIdsMap.get(key2).add(String(epicId));
              
              summary.epicsCreated += 1; // Đếm EPIC được tạo tự động
            } catch (createError) {
              console.error(`[applyEventPlannerPlan] Lỗi khi tạo EPIC tự động:`, createError);
              summary.errors.push(
                `Không thể tạo EPIC tự động cho tasks_plan với department="${deptName}", epicTitle="${epicTitle}": ${createError.message}`
              );
              continue;
            }
          } else {
            // Nếu không phải HoOC, báo lỗi
            summary.errors.push(
              `Không tìm thấy EPIC cho tasks_plan với department="${deptName}", epicTitle="${epicTitle}". ` +
              `Đã thử key: "${key1}". ` +
              `Các EPIC có sẵn cho department này: ${availableKeys.length > 0 ? availableKeys.join(', ') : 'không có'}. ` +
              `Lưu ý: EPIC cần được tạo trước khi tạo tasks. Nếu bạn là HoD, vui lòng yêu cầu HoOC tạo EPIC trước.`
            );
            continue;
          }
        }

        // Nếu không có epicTitle, thử dùng key2 (department) nhưng chỉ khi có đúng 1 EPIC
        if (!epicId && !epicTitle) {
          const epicIdsForDept = deptToEpicIdsMap.get(key2);
          if (!epicIdsForDept || epicIdsForDept.size === 0) {
            summary.errors.push(
              `Không tìm thấy EPIC cho tasks_plan: department="${deptName}", epicTitle rỗng. ` +
              `Department này không có EPIC nào.`
            );
            continue;
          } else if (epicIdsForDept.size === 1) {
            // Chỉ có 1 EPIC trong department này, dùng nó
            epicId = Array.from(epicIdsForDept)[0];
          } else {
            // Có nhiều EPIC cùng department, không thể xác định được
            const availableEpics = Array.from(epicIdMap.keys())
              .filter(k => k.startsWith(key2 + ':'))
              .map(k => k.substring(key2.length + 1));
            summary.errors.push(
              `Không thể xác định EPIC cho tasks_plan: department="${deptName}" có ${epicIdsForDept.size} EPIC. ` +
              `Cần cung cấp epicTitle. Các EPIC có sẵn: ${availableEpics.join(', ')}`
            );
            continue;
          }
        }

        if (!epicId) {
          summary.errors.push(
            `Không tìm thấy EPIC cho tasks_plan: department="${deptName}", epicTitle="${epicTitle}". ` +
            `Đã thử các key: "${key1}", "${key2}".`
          );
          continue;
        }
      } else {
        // Có epicId hợp lệ từ plan, nhưng nên ưu tiên dùng epicId từ map nếu có
        // Vì epicId từ plan có thể là từ lần apply trước hoặc không đúng
        const epicIdStr = String(epicId);
        const deptName = (rawPlan.department || '').trim();
        const epicTitle = (rawPlan.epicTitle || '').trim();

        if (deptName && epicTitle) {
          // Normalize: lowercase, trim, và loại bỏ khoảng trắng thừa (giống như khi tạo EPIC)
          const normalizedDeptName = deptName.toLowerCase().trim().replace(/\s+/g, ' ');
          const normalizedEpicTitle = epicTitle.toLowerCase().trim().replace(/\s+/g, ' ');
          const key1 = `${normalizedDeptName}:${normalizedEpicTitle}`;
          
          console.log(`[applyEventPlannerPlan] Tìm EPIC với epicId hợp lệ từ plan, key="${key1}" (department="${deptName}", epicTitle="${epicTitle}")`);
          console.log(`[applyEventPlannerPlan] Các keys có trong epicIdMap:`, Array.from(epicIdMap.keys()));
          
          const mappedEpicId = epicIdMap.get(key1);
          
          if (mappedEpicId) {
            // Ưu tiên dùng epicId từ map (EPIC vừa được tạo trong lần apply này)
            if (String(mappedEpicId) !== epicIdStr) {
              console.log(
                `[applyEventPlannerPlan] Thay thế epicId từ plan (${epicIdStr}) bằng epicId từ map (${mappedEpicId}) ` +
                `cho key "${key1}" vì EPIC vừa được tạo trong lần apply này.`
              );
              epicId = mappedEpicId;
            }
          } else {
            // Không tìm thấy trong map, validate epicId có thuộc về event này không
            try {
              const existingEpic = await Task.findOne({
                _id: epicIdStr,
                eventId: planEventId,
                taskType: 'epic',
              }).lean();

              if (!existingEpic) {
                console.warn(
                  `[applyEventPlannerPlan] EpicId ${epicIdStr} không tồn tại trong event ${planEventId}. ` +
                  `Thử tìm EPIC bằng department và title...`
                );
                
                // Thử tìm EPIC bằng department và title
                const department = await Department.findOne({
                  eventId: planEventId,
                  name: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                }).lean();

                if (department) {
                  // Tìm EPIC với title và departmentId (exact match hoặc contains)
                  let foundEpic = await Task.findOne({
                    eventId: planEventId,
                    taskType: 'epic',
                    title: { $regex: new RegExp(epicTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                    departmentId: department._id,
                  }).lean();

                  // Nếu không tìm thấy exact match, KHÔNG tự động match với EPIC khác
                  // Vì có thể dẫn đến match sai (ví dụ: "chuẩn bị đồ ăn" match với "truyền thông")
                  // Thay vào đó, sẽ tự động tạo EPIC mới nếu là HoOC (xử lý ở phần sau)
                  if (!foundEpic) {
                    console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}" trong database. Sẽ tự động tạo EPIC mới nếu là HoOC.`);
                  }

                  // Nếu vẫn không tìm thấy, thử lấy EPIC mới nhất trong department (CHỈ KHI có đúng 1 EPIC)
                  // Không fallback khi có nhiều EPIC vì có thể map sai
                  if (!foundEpic) {
                    const allEpicsInDept = await Task.find({
                      eventId: planEventId,
                      taskType: 'epic',
                      departmentId: department._id,
                    }).sort({ createdAt: -1 }).lean();
                    
                    if (allEpicsInDept.length === 1) {
                      foundEpic = allEpicsInDept[0];
                      console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}", sử dụng EPIC mới nhất trong department: ${foundEpic.title} (vì chỉ có 1 EPIC)`);
                    } else if (allEpicsInDept.length > 1) {
                      console.warn(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}" trong department "${deptName}". Department này có ${allEpicsInDept.length} EPIC, không thể tự động map. Cần epicTitle chính xác.`);
                    }
                  }

                  if (foundEpic) {
                    console.log(
                      `[applyEventPlannerPlan] Tìm thấy EPIC đúng trong event: ${foundEpic._id} ` +
                      `(title: "${foundEpic.title}", department: "${deptName}"). Thay thế epicId.`
                    );
                    epicId = foundEpic._id;
                    // Lưu vào map với key đã normalize
                    const normalizedDeptName = deptName.toLowerCase().trim().replace(/\s+/g, ' ');
                    const normalizedEpicTitle = epicTitle.toLowerCase().trim().replace(/\s+/g, ' ');
                    const mapKey = `${normalizedDeptName}:${normalizedEpicTitle}`;
                    epicIdMap.set(mapKey, String(epicId));
                    const key2 = normalizedDeptName;
                    if (!deptToEpicIdsMap.has(key2)) {
                      deptToEpicIdsMap.set(key2, new Set());
                    }
                    deptToEpicIdsMap.get(key2).add(String(epicId));
                  } else {
                    // Nếu không tìm thấy EPIC và là HoOC, tự động tạo EPIC mới
                    if (userRole === 'HoOC') {
                      try {
                        console.log(`[applyEventPlannerPlan] Không tìm thấy EPIC với title="${epicTitle}", tự động tạo EPIC mới cho department="${deptName}"`);
                        
                        const newEpic = await Task.create({
                          title: epicTitle,
                          description: `EPIC được tạo tự động từ tasks_plan`,
                          eventId: planEventId,
                          departmentId: department._id,
                          parentId: null,
                          assigneeId: null,
                          status: 'chua_bat_dau',
                          taskType: 'epic',
                          createdBy: userId,
                        });

                        epicId = newEpic._id;
                        console.log(`[applyEventPlannerPlan] Đã tạo EPIC mới: ${epicId} (title: "${epicTitle}", department: "${deptName}")`);
                        
                        // Lưu vào map
                        const normalizedDeptName = deptName.toLowerCase().trim().replace(/\s+/g, ' ');
                        const normalizedEpicTitle = epicTitle.toLowerCase().trim().replace(/\s+/g, ' ');
                        const mapKey = `${normalizedDeptName}:${normalizedEpicTitle}`;
                        epicIdMap.set(mapKey, String(epicId));
                        const key2 = normalizedDeptName;
                        if (!deptToEpicIdsMap.has(key2)) {
                          deptToEpicIdsMap.set(key2, new Set());
                        }
                        deptToEpicIdsMap.get(key2).add(String(epicId));
                        
                        summary.epicsCreated += 1; // Đếm EPIC được tạo tự động
                      } catch (createError) {
                        console.error(`[applyEventPlannerPlan] Lỗi khi tạo EPIC tự động:`, createError);
                        summary.errors.push(
                          `Không thể tạo EPIC tự động cho tasks_plan với department="${deptName}", epicTitle="${epicTitle}": ${createError.message}`
                        );
                        continue;
                      }
                    } else {
                      summary.errors.push(
                        `EpicId ${epicIdStr} không tồn tại trong event này và không tìm thấy EPIC với ` +
                        `department="${deptName}", epicTitle="${epicTitle}". ` +
                        `Vui lòng đảm bảo EPIC đã được tạo trước khi tạo tasks.`
                      );
                      continue;
                    }
                  }
                } else {
                  summary.errors.push(
                    `Không tìm thấy department "${deptName}" trong event này. ` +
                    `EpicId ${epicIdStr} cũng không tồn tại trong event.`
                  );
                  continue;
                }
              } else {
                console.log(
                  `[applyEventPlannerPlan] EpicId ${epicIdStr} hợp lệ và thuộc về event ${planEventId}. ` +
                  `Sẽ tạo TASK với epicId này.`
                );
              }
            } catch (dbError) {
              console.warn(`[applyEventPlannerPlan] Lỗi khi validate epicId:`, dbError);
              // Vẫn thử tạo TASK, API sẽ validate lại
            }
          }
        } else {
          // Không có department hoặc epicTitle, validate epicId có thuộc về event này không
          try {
            const existingEpic = await Task.findOne({
              _id: epicIdStr,
              eventId: planEventId,
              taskType: 'epic',
            }).lean();

            if (!existingEpic) {
              summary.errors.push(
                `EpicId ${epicIdStr} không tồn tại trong event ${planEventId}. ` +
                `Thiếu thông tin department hoặc epicTitle để tìm EPIC thay thế.`
              );
              continue;
            }
          } catch (dbError) {
            console.warn(`[applyEventPlannerPlan] Lỗi khi validate epicId:`, dbError);
            // Vẫn thử tạo TASK, API sẽ validate lại
          }
        }
      }

      // Đảm bảo các biến được định nghĩa để log
      const epicIdStr = String(epicId);
      const deptName = (rawPlan.department || '').trim();
      const epicTitle = (rawPlan.epicTitle || '').trim();
      
      if (!epicId) {
        console.error(`[applyEventPlannerPlan] Không có epicId để tạo TASK! department="${deptName}", epicTitle="${epicTitle}"`);
        summary.errors.push(`Không có epicId để tạo TASK cho department="${deptName}", epicTitle="${epicTitle}"`);
        continue;
      }

      const payload = {
        tasks,
        eventStartDate: rawPlan.eventStartDate || null,
        epicTitle: epicTitle,
        department: deptName,
      };

      try {
        const apiUrl = `${SELF_BASE_URL}/api/events/${planEventId}/epics/${epicId}/tasks/ai-bulk-create`;
        console.log(`[applyEventPlannerPlan] Gọi API tạo TASK: ${apiUrl}`);
        console.log(`[applyEventPlannerPlan] epicId=${epicIdStr}, department="${deptName}", epicTitle="${epicTitle}"`);
        console.log(`[applyEventPlannerPlan] Số lượng TASK cần tạo: ${tasks.length}`);
        
        const resp = await axios.post(
          apiUrl,
          payload,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            timeout: 120_000,
          }
        );
        const respData = resp?.data || {};
        const created = Array.isArray(respData.data) ? respData.data.length : 0;
        
        // Kiểm tra response status
        if (resp.status !== 201) {
          console.warn(`[applyEventPlannerPlan] Response status không phải 201: ${resp.status}`, respData);
        }
        
        summary.tasksCreated += created;
        
        // Log chi tiết để debug
        console.log(`[applyEventPlannerPlan] Đã tạo ${created} TASK cho epicId=${epicId}, eventId=${planEventId}`);
        if (created > 0 && respData.data && respData.data.length > 0) {
          console.log(`[applyEventPlannerPlan] TASK IDs: ${respData.data.slice(0, 5).map(t => t._id || t.id).join(', ')}${created > 5 ? '...' : ''}`);
          console.log(`[applyEventPlannerPlan] TASK Titles: ${respData.data.slice(0, 5).map(t => t.title).join(', ')}${created > 5 ? '...' : ''}`);
        } else {
          console.warn(`[applyEventPlannerPlan] Không có TASK nào được tạo! Response:`, JSON.stringify(respData, null, 2));
        }
        if (respData.errors && respData.errors.length > 0) {
          console.warn(`[applyEventPlannerPlan] Có ${respData.errors.length} lỗi khi tạo TASK:`, respData.errors);
          summary.errors.push(...respData.errors.map(e => `TASK creation error: ${e}`));
        }
      } catch (e) {
        console.error('applyEventPlannerPlan: apply tasks failed', {
          error: e?.message,
          response: e?.response?.data,
          status: e?.response?.status,
          stack: e?.stack,
          epicId: epicIdStr,
          department: deptName,
          epicTitle: epicTitle,
        });
        const errorMsg = e?.response?.data?.message || e?.message || 'Unknown error';
        summary.errors.push(
          `Lỗi áp dụng TASK plan cho epicId=${epicIdStr} (department: "${deptName}", epicTitle: "${epicTitle}"): ${errorMsg}`
        );
        
        // Nếu là lỗi network hoặc timeout, thêm thông tin chi tiết
        if (e?.code === 'ECONNREFUSED' || e?.code === 'ETIMEDOUT') {
          summary.errors.push(`Không thể kết nối tới API tạo TASK. Kiểm tra SELF_BASE_URL: ${SELF_BASE_URL}`);
        }
      }
    }

    // Sau khi áp dụng thành công, đánh dấu plans đã được áp dụng trong conversation history
    if (userId && sessionId) {
      try {
        const query = {
          userId,
          sessionId,
          channel: CHANNEL_AGENT,
        };
        if (eventId) {
          query.eventId = eventId;
        } else {
          query.eventId = null;
        }
        
        const conversation = await ConversationHistory.findOne(query);
        if (conversation) {
          // Tìm message có plans và đánh dấu đã áp dụng
          // Tìm message cuối cùng có plans (chưa được áp dụng)
          let updated = false;
          const messagesWithPlans = conversation.messages
            .map((msg, idx) => ({ msg, idx }))
            .filter(
              ({ msg }) =>
                msg.role === 'assistant' &&
                msg.data &&
                msg.data.plans &&
                Array.isArray(msg.data.plans) &&
                msg.data.plans.length > 0 &&
                !msg.data.applied
            )
            .reverse(); // Từ cuối lên đầu
          
          // Đánh dấu message cuối cùng có plans (thường là message mới nhất)
          if (messagesWithPlans.length > 0) {
            const { idx } = messagesWithPlans[0];
            const originalMsg = conversation.messages[idx];
            
            // Đảm bảo giữ nguyên tất cả các fields required (role, content, timestamp)
            if (originalMsg && originalMsg.role && originalMsg.content) {
              conversation.messages[idx] = {
                role: originalMsg.role,
                content: originalMsg.content,
                timestamp: originalMsg.timestamp || new Date(),
                data: {
                  ...(originalMsg.data || {}),
                  applied: true, // Đánh dấu đã áp dụng
                },
              };
              updated = true;
            } else {
              console.warn(`[applyEventPlannerPlan] Message tại index ${idx} không có đầy đủ role/content, bỏ qua update`, originalMsg);
            }
          }
          
          if (updated) {
            conversation.updatedAt = new Date();
            await conversation.save();
          }
        }
      } catch (e) {
        // Không chặn response nếu lỗi lưu trạng thái
        console.warn('applyEventPlannerPlan: failed to mark plans as applied', e);
      }
    }

    // Log summary trước khi trả về
    console.log('[applyEventPlannerPlan] Summary:', {
      epicsRequests: summary.epicsRequests,
      epicsCreated: summary.epicsCreated,
      taskRequests: summary.taskRequests,
      tasksCreated: summary.tasksCreated,
      errors: summary.errors.length,
      totalPlans: plans.length,
      planTypes: plans.map(p => p?.type).filter(Boolean),
    });
    
    // Cảnh báo nếu không có EPIC/TASK nào được tạo
    if (summary.epicsRequests > 0 && summary.epicsCreated === 0) {
      const warningMsg = `Cảnh báo: Không có EPIC nào được tạo mặc dù có ${summary.epicsRequests} yêu cầu tạo EPIC!`;
      console.error(`[applyEventPlannerPlan] ${warningMsg}`);
      if (summary.errors.length === 0) {
        summary.errors.push(warningMsg + ' Không có thông tin lỗi chi tiết. Vui lòng kiểm tra logs.');
      }
    }
    
    if (summary.taskRequests > 0 && summary.tasksCreated === 0) {
      const warningMsg = `Cảnh báo: Không có TASK nào được tạo mặc dù có ${summary.taskRequests} yêu cầu tạo TASK!`;
      console.error(`[applyEventPlannerPlan] ${warningMsg}`);
      if (summary.errors.length === 0) {
        summary.errors.push(warningMsg + ' Không có thông tin lỗi chi tiết. Vui lòng kiểm tra logs.');
      }
    }
    
    // Kiểm tra nếu không có plans hợp lệ nào
    const validPlansCount = plans.filter(p => {
      if (!p || typeof p !== 'object') return false;
      if (p.type === 'epics_plan') {
        return Array.isArray(p?.plan?.epics) && p.plan.epics.length > 0;
      }
      if (p.type === 'tasks_plan') {
        return Array.isArray(p?.plan?.tasks) && p.plan.tasks.length > 0;
      }
      return false;
    }).length;
    
    if (validPlansCount === 0 && plans.length > 0) {
      summary.errors.push(`Không có plans hợp lệ nào. Tổng số plans: ${plans.length}. Vui lòng kiểm tra format của plans.`);
    }
    
    if (summary.errors.length > 0) {
      console.warn('[applyEventPlannerPlan] Có lỗi:', summary.errors);
    }

    // Nếu không có gì được tạo, trả về warning status
    const hasAnyCreated = summary.epicsCreated > 0 || summary.tasksCreated > 0;
    const statusCode = hasAnyCreated ? 200 : (summary.errors.length > 0 ? 207 : 400); // 207 = Multi-Status

    return res.status(statusCode).json({
      message: hasAnyCreated
        ? `Áp dụng kế hoạch EPIC/TASK từ AI Event Planner hoàn tất. Đã tạo ${summary.epicsCreated} EPIC và ${summary.tasksCreated} TASK.`
        : `Không có EPIC/TASK nào được tạo. ${summary.errors.length > 0 ? 'Xem chi tiết lỗi trong summary.errors.' : 'Vui lòng kiểm tra format của plans.'}`,
      summary,
    });
  } catch (err) {
    console.error('applyEventPlannerPlan error:', err);
    return res.status(500).json({
      message: 'Apply kế hoạch từ AI Event Planner thất bại',
      error: err.message,
    });
  }
};

export const listAgentSessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { eventId } = req.query || {};

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Lọc theo channel agent mới để chỉ lấy các session từ AI Assistant
    const filter = { userId, channel: CHANNEL_AGENT };
    // Nếu có eventId thì lọc theo eventId, nếu không thì lấy các session không có eventId (null)
    if (eventId !== undefined && eventId !== null && eventId !== '') {
      filter.eventId = eventId;
    } else {
      // Khi không có eventId trong query, lấy cả session có eventId = null và session không có eventId
      filter.$or = [
        { eventId: null },
        { eventId: { $exists: false } }
      ];
    }

    const sessions = await ConversationHistory.find(filter)
      .sort({ updatedAt: -1 })
      .select('sessionId title updatedAt eventId channel')
      .lean();

    return res.status(200).json({ sessions });
  } catch (err) {
    console.error('listAgentSessions error:', err);
    return res.status(500).json({ message: 'Failed to load sessions' });
  }
};

export const getAgentSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;
    const { eventId } = req.query || {};

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Ưu tiên tìm theo channel agent mới; nếu không thấy thì fallback session bất kỳ
    const baseFilter = { userId, sessionId };
    const filter = { ...baseFilter, channel: CHANNEL_AGENT };
    // Nếu có eventId thì tìm theo eventId, nếu không thì tìm với eventId = null
    if (eventId !== undefined && eventId !== null && eventId !== '') {
      filter.eventId = eventId;
    } else {
      filter.$or = [
        { eventId: null },
        { eventId: { $exists: false } }
      ];
    }

    let conversation = await ConversationHistory.findOne(filter).lean();
    if (!conversation) {
      conversation = await ConversationHistory.findOne(baseFilter).lean();
      if (!conversation) {
        return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
      }
    }

    return res.status(200).json({ conversation });
  } catch (err) {
    console.error('getAgentSession error:', err);
    return res.status(500).json({ message: 'Failed to load conversation' });
  }
};