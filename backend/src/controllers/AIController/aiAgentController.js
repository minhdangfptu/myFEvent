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

const AI_AGENT_BASE_URL = config.AI_AGENT_BASE_URL || 'http://localhost:9000';
const CHANNEL_AGENT = 'event_planner_agent';
const SELF_BASE_URL =
  config.SELF_BASE_URL || `https://myfevent-ai-assistant-production.up.railway.app/`;

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

    // 8) Lấy milestones
    const milestones = await Milestone.find({
      eventId,
      isDeleted: false,
    })
      .select('_id name description targetDate')
      .sort({ targetDate: 1 })
      .lean();

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
      summary: {
        totalDepartments: departments.length,
        totalMembers,
        totalEpics: epics.length,
        totalTasks: tasks.length,
        totalRisks: risks.length,
        upcomingCalendarsCount: upcomingCalendars.length,
        totalMilestones: milestones.length,
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

  const { event, currentUser, departments, members, epics, risks, calendars, milestones, summary } = eventData;

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
    `- Người tổ chức: ${event.organizerName || 'N/A'}`,
    ``,
  ];

  if (currentUser) {
    lines.push(
      `=== THÔNG TIN NGƯỜI DÙNG HIỆN TẠI ===`,
      `- Vai trò: ${currentUser.role}`,
      `- Ban: ${currentUser.departmentName || 'Chưa có ban'}`,
      ``,
    );
  }

  lines.push(
    `=== TỔNG QUAN ===`,
    `- Tổng số ban: ${summary.totalDepartments}`,
    `- Tổng số thành viên: ${summary.totalMembers} (HoOC: ${members.byRole.HoOC}, HoD: ${members.byRole.HoD}, Member: ${members.byRole.Member})`,
    `- Tổng số EPIC: ${summary.totalEpics}`,
    `- Tổng số TASK: ${summary.totalTasks}`,
    `- Tổng số rủi ro: ${summary.totalRisks}`,
    `- Số lịch sắp tới: ${summary.upcomingCalendarsCount}`,
    `- Số cột mốc: ${summary.totalMilestones}`,
    ``,
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
        lines.push(`  ${idx + 1}. ${m.userName || 'N/A'} (${m.role || 'Member'})${emailInfo}`);
      });
    });

    // Nếu là HoOC, hiển thị thêm thông tin tổng hợp
    if (currentUser && currentUser.role === 'HoOC') {
      lines.push(`\nTổng hợp:`);
      lines.push(`- Tổng số thành viên: ${members.total}`);
      lines.push(`- HoOC: ${members.byRole.HoOC} người`);
      lines.push(`- HoD: ${members.byRole.HoD} người`);
      lines.push(`- Member: ${members.byRole.Member} người`);
    }
    
    lines.push(``);
  }

  if (epics.length > 0) {
    lines.push(`=== DANH SÁCH EPIC VÀ TASK ===`);
    epics.forEach((epic, idx) => {
      const deptName = epic.departmentId?.name || 'Chưa có ban';
      lines.push(`${idx + 1}. Epic: ${epic.title} (${deptName}) - Trạng thái: ${epic.status || 'N/A'} - Số task: ${epic.taskCount || 0}`);
      if (epic.description) {
        lines.push(`   Mô tả: ${epic.description}`);
      }
      
      // Hiển thị danh sách tasks trong epic (nếu có)
      if (epic.tasks && epic.tasks.length > 0) {
        lines.push(`   Các task:`);
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

  if (milestones.length > 0) {
    lines.push(`=== CỘT MỐC ===`);
    milestones.forEach((ms, idx) => {
      const targetDate = new Date(ms.targetDate).toLocaleDateString('vi-VN');
      lines.push(`${idx + 1}. ${ms.name} - ${targetDate}`);
      if (ms.description) {
        lines.push(`   ${ms.description}`);
      }
    });
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
    
    lines.push(
      `- ${currentUser.role} KHÔNG được phép hỏi hoặc xem thông tin tài chính (budget, expense, chi phí) của người khác hoặc các ban khác`,
      `- Nếu ${currentUser.role} hỏi về tài chính của ban khác hoặc người khác, trả lời rằng không thể cung cấp thông tin này`,
      `- ${currentUser.role} chỉ có thể xem thông tin tài chính của ban mình (nếu có quyền) hoặc thông tin chung của sự kiện`,
    );
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
            `- Khi người dùng nói "sự kiện này" thì hiểu là eventId = ${eventId}`,
            `- Khi người dùng yêu cầu "tạo task cho sự kiện này" hoặc câu tương tự, hãy hiểu là tạo task cho eventId = ${eventId}`,
            `- TRƯỚC KHI tạo task/epic, BẮT BUỘC phải gọi tool get_event_detail_for_ai với eventId = "${eventId}" để lấy thông tin chi tiết`,
            `- Nếu bạn chưa gọi get_event_detail_for_ai, HÃY GỌI NGAY với eventId = "${eventId}"`,
            `- Khi tạo task/epic, luôn gắn với eventId = ${eventId} (qua các tool tương ứng)`,
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
            `- TRƯỚC KHI tạo task/epic, BẮT BUỘC phải gọi tool get_event_detail_for_ai với eventId = "${eventId}" để lấy thông tin chi tiết`,
            `- Nếu bạn chưa gọi get_event_detail_for_ai, HÃY GỌI NGAY với eventId = "${eventId}"`,
            `- Khi tạo task/epic, luôn gắn với eventId = ${eventId} (qua các tool tương ứng)`,
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
    console.log(`[aiAgentController] Calling FastAPI:`, {
      url: apiUrl,
      baseURL: AI_AGENT_BASE_URL,
      endpoint: '/agent/event-planner/turn',
      historyMessagesCount: enrichedMessages.length,
    });

    const pythonRes = await axios.post(
      apiUrl,
      { history_messages: enrichedMessages },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 180_000, // 180 giây (3 phút) - đủ thời gian cho AI gọi nhiều tool, RAG, và LLM
      }
    );

    const agentData = pythonRes.data || {};
    const assistantReply = agentData.assistant_reply || '';

    // Debug: log plans từ Python
    console.log('[aiAgentController] Python response:', {
      hasPlans: !!agentData.plans,
      plansType: typeof agentData.plans,
      plansIsArray: Array.isArray(agentData.plans),
      plansLength: Array.isArray(agentData.plans) ? agentData.plans.length : 'N/A',
      plans: agentData.plans,
    });

    // Xác định sessionId cho cuộc trò chuyện hiện tại
    const sessionId =
      rawSessionId ||
      agentData.sessionId ||
      agentData.session_id ||
      `agent-${Date.now()}`;

    // Lưu lịch sử vào ConversationHistory (giống ChatGPT-style)
    if (userId && eventId) {
      try {
        let conversation = await ConversationHistory.findOne({
          userId,
          eventId,
          sessionId,
          channel: CHANNEL_AGENT,
        });

        if (!conversation) {
          conversation = new ConversationHistory({
            userId,
            eventId,
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
            console.log(`[aiAgentController] Set conversation title: "${newTitle}" for sessionId=${sessionId}`);
          }
        }

        conversation.updatedAt = new Date();
        await conversation.save();
        console.log(`[aiAgentController] Saved conversation: sessionId=${sessionId}, messagesCount=${conversation.messages.length}`);
      } catch (e) {
        console.error('runEventPlannerAgent: lỗi lưu ConversationHistory', e);
        // Log chi tiết để debug
        console.error('Error details:', {
          userId,
          eventId,
          sessionId,
          error: e.message,
          stack: e.stack,
        });
      }
    } else {
      console.warn('[aiAgentController] Cannot save conversation: missing userId or eventId', {
        hasUserId: !!userId,
        hasEventId: !!eventId,
      });
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

    // Nếu là lỗi kết nối (ECONNREFUSED, ETIMEDOUT, etc.)
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
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
    const { plans, eventId: bodyEventId } = req.body || {};
    const userId = req.user?.id;

    if (!Array.isArray(plans) || plans.length === 0) {
      return res
        .status(400)
        .json({ message: 'plans phải là một mảng và không được rỗng' });
    }

    // eventId có thể nằm trong body hoặc từng plan
    const eventId =
      bodyEventId ||
      plans.find((p) => p?.eventId)?.eventId ||
      null;

    if (!eventId) {
      return res.status(400).json({ message: 'Thiếu eventId trong request' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Thiếu Authorization header (JWT)' });
    }

    const summary = {
      epicsRequests: 0,
      taskRequests: 0,
      epicsCreated: 0,
      tasksCreated: 0,
      errors: [],
    };

    // Map để lưu epicId mới được tạo: key = "department:epicTitle" hoặc "department"
    const epicIdMap = new Map();

    // BƯỚC 1: Tạo tất cả EPIC trước
    for (const rawPlan of plans) {
      if (!rawPlan || typeof rawPlan !== 'object') continue;
      if (rawPlan.type !== 'epics_plan') continue;

        summary.epicsRequests += 1;
        const planEventId = rawPlan.eventId || eventId;
        const epicsPlan = rawPlan.plan || {};
        const epics = Array.isArray(epicsPlan.epics)
          ? epicsPlan.epics
          : [];
        if (!epics.length) continue;

        try {
          const resp = await axios.post(
            `${SELF_BASE_URL}/api/events/${planEventId}/epics/ai-bulk-create`,
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
        summary.epicsCreated += createdEpics.length;

        // Lưu mapping: department + epicTitle -> epicId mới
        // Sử dụng thông tin từ epics array ban đầu để map
        createdEpics.forEach((epic, index) => {
          if (!epic || !epic._id) return;
          // Lấy thông tin từ epic ban đầu (epics[index]) vì response có thể không có departmentId.name
          const originalEpic = epics[index];
          const deptName = (originalEpic?.department || '').trim();
          const epicTitle = (epic.title || originalEpic?.title || '').trim();
          
          // Tạo key để map: "department:epicTitle"
          const key1 = `${deptName}:${epicTitle}`.toLowerCase().trim();
          const key2 = deptName.toLowerCase().trim();
          
          epicIdMap.set(key1, String(epic._id));
          // Nếu có department nhưng không có epicTitle cụ thể, dùng key2
          if (deptName && !epicTitle) {
            epicIdMap.set(key2, String(epic._id));
          }
          
          console.log('[applyEventPlannerPlan] Mapped epic:', {
            epicId: String(epic._id),
            department: deptName,
            epicTitle,
            key1,
            key2,
          });
        });

        console.log('[applyEventPlannerPlan] Created epics and mapped:', Array.from(epicIdMap.entries()));
        } catch (e) {
          console.error('applyEventPlannerPlan: apply epics failed', e?.response?.data || e);
          summary.errors.push(
            `Lỗi áp dụng EPIC plan cho eventId=${planEventId}: ${
              e?.response?.data?.message || e.message
            }`
          );
        }
    }

    // BƯỚC 2: Tạo TASK, map epicId từ EPIC vừa tạo
    for (const rawPlan of plans) {
      if (!rawPlan || typeof rawPlan !== 'object') continue;
      if (rawPlan.type !== 'tasks_plan') continue;

        summary.taskRequests += 1;
        const planEventId = rawPlan.eventId || eventId;
      let epicId = rawPlan.epicId;
        const tasksPlan = rawPlan.plan || {};
        const tasks = Array.isArray(tasksPlan.tasks)
          ? tasksPlan.tasks
          : [];

      if (!tasks.length) continue;

      // Nếu không có epicId hoặc epicId không hợp lệ, thử tìm từ map
      if (!epicId || !epicId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        const deptName = rawPlan.department || '';
        const epicTitle = rawPlan.epicTitle || '';
        const key1 = `${deptName}:${epicTitle}`.toLowerCase().trim();
        const key2 = deptName.toLowerCase().trim();
        
        epicId = epicIdMap.get(key1) || epicIdMap.get(key2);
        
        if (!epicId) {
          console.warn('[applyEventPlannerPlan] Cannot find epicId for tasks_plan:', {
            department: deptName,
            epicTitle,
            originalEpicId: rawPlan.epicId,
          });
          summary.errors.push(
            `Không tìm thấy EPIC cho tasks_plan: department="${deptName}", epicTitle="${epicTitle}". Có thể EPIC chưa được tạo hoặc không khớp.`
          );
          continue;
        }
        console.log('[applyEventPlannerPlan] Mapped epicId for tasks_plan:', {
          department: deptName,
          epicTitle,
          mappedEpicId: epicId,
        });
      }

        const payload = {
          tasks,
          eventStartDate: rawPlan.eventStartDate || null,
          epicTitle: rawPlan.epicTitle || '',
          department: rawPlan.department || '',
        };

        try {
          const resp = await axios.post(
            `${SELF_BASE_URL}/api/events/${planEventId}/epics/${epicId}/tasks/ai-bulk-create`,
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
          summary.tasksCreated += created;
        } catch (e) {
          console.error('applyEventPlannerPlan: apply tasks failed', e?.response?.data || e);
          summary.errors.push(
            `Lỗi áp dụng TASK plan cho epicId=${epicId}: ${
              e?.response?.data?.message || e.message
            }`
          );
      }
    }

    return res.status(200).json({
      message:
        'Áp dụng kế hoạch EPIC/TASK từ AI Event Planner hoàn tất (xem chi tiết trong summary).',
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
    if (eventId) filter.eventId = eventId;

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
    if (eventId) filter.eventId = eventId;

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
