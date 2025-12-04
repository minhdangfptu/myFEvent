// src/controllers/AIController/aiAgentController.js
import axios from 'axios';
import { config } from '../../config/environment.js';
import Event from '../../models/event.js';
import ConversationHistory from '../../models/conversationHistory.js';

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

    // Tăng cường ngữ cảnh: nếu có eventId thì lấy thông tin sự kiện từ Mongo
    let enrichedMessages = [...history_messages];
    if (eventId) {
      try {
        const event = await Event.findById(eventId).lean();
        if (event) {
          const contextLines = [
            `Bạn đang hỗ trợ lập kế hoạch cho một sự kiện trong hệ thống myFEvent.`,
            `Nếu người dùng nói "sự kiện này" thì hiểu là eventId = ${eventId}.`,
            `EVENT_CONTEXT_JSON: {"eventId": "${eventId}"}`,
            `Thông tin sự kiện:`,
            `- Tên: ${event.name}`,
            `- Loại: ${event.type}`,
            `- Địa điểm: ${event.location || 'N/A'}`,
            `- Thời gian: ${event.eventStartDate || 'N/A'} → ${event.eventEndDate || 'N/A'}`,
            `Khi người dùng yêu cầu "tạo task cho sự kiện này" hoặc câu tương tự, hãy hiểu là tạo task cho eventId này.`,
            `Khi tạo task/epic, luôn gắn với eventId này (qua các tool tương ứng).`,
          ].join('\n');

          enrichedMessages = [
            { role: 'system', content: contextLines },
            ...history_messages,
          ];
        }
      } catch (e) {
        // Không chặn toàn bộ flow nếu lỗi đọc DB
        console.warn('runEventPlannerAgent: lỗi load event context', e);
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

        // Thêm user message cuối cùng
        const lastUser = [...history_messages]
          .reverse()
          .find((m) => m.role === 'user');
        if (lastUser) {
          conversation.messages.push({
            role: 'user',
            content: lastUser.content,
            timestamp: new Date(),
          });
        }

        // Thêm assistant reply
        if (assistantReply) {
          const plans = Array.isArray(agentData.plans) ? agentData.plans : [];
          conversation.messages.push({
            role: 'assistant',
            content: assistantReply,
            timestamp: new Date(),
            data: plans.length > 0 ? { plans } : undefined, // Lưu plans vào message data
          });
        }

        // Gán title nếu chưa có
        if (!conversation.title) {
          const firstUser =
            conversation.messages.find((m) => m.role === 'user') || lastUser;
          if (firstUser) {
            conversation.title = generateTitleFromText(firstUser.content);
          }
        }

        conversation.updatedAt = new Date();
        await conversation.save();
      } catch (e) {
        console.warn('runEventPlannerAgent: lỗi lưu ConversationHistory', e);
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

    // Áp dụng lần lượt từng plan bằng cách proxy sang các endpoint /events/.../ai-bulk-create hiện có.
    for (const rawPlan of plans) {
      if (!rawPlan || typeof rawPlan !== 'object') continue;

      const { type } = rawPlan;

      if (type === 'epics_plan') {
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
          const created = Array.isArray(respData.data) ? respData.data.length : 0;
          summary.epicsCreated += created;
        } catch (e) {
          console.error('applyEventPlannerPlan: apply epics failed', e?.response?.data || e);
          summary.errors.push(
            `Lỗi áp dụng EPIC plan cho eventId=${planEventId}: ${
              e?.response?.data?.message || e.message
            }`
          );
        }
      } else if (type === 'tasks_plan') {
        summary.taskRequests += 1;
        const planEventId = rawPlan.eventId || eventId;
        const epicId = rawPlan.epicId;
        const tasksPlan = rawPlan.plan || {};
        const tasks = Array.isArray(tasksPlan.tasks)
          ? tasksPlan.tasks
          : [];

        if (!epicId || !tasks.length) continue;

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

    // Mặc định ưu tiên channel agent mới,
    // nhưng cũng có thể lấy thêm các session cũ (channel khác) cho cùng event.
    const filter = { userId };
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
