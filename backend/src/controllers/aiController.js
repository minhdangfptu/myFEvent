import { generateWBS, generateWBSViaChat } from '../services/aiService.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import Event from '../models/event.js';
import Department from '../models/department.js';
import EventMember from '../models/eventMember.js';
import Epic from '../models/epic.js';
import Task from '../models/task.js';
import Risk from '../models/risk.js';
import ConversationHistory from '../models/conversationHistory.js';

/**
 * POST /api/events/:eventId/ai/generate-wbs
 * Generate WBS using AI (JSON input)
 */
export const generateWBSWithAI = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if user is HOOC
    const member = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền generate WBS bằng AI' });
    }

    // Get event data
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    // Get departments
    const departments = await Department.find({ eventId }).select('name').lean();
    const departmentNames = departments.map(d => d.name);

    // Prepare event data for AI
    const eventData = {
      eventName: event.name || 'Sự kiện',
      eventType: req.body.eventType || 'conference',
      eventDate: event.eventEndDate ? new Date(event.eventEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startDate: event.eventStartDate ? new Date(event.eventStartDate).toISOString().split('T')[0] : null,
      venue: event.venue || 'FPT University',
      headcountTotal: req.body.headcountTotal || 50,
      departments: departmentNames,
    };

    // Call AI service
    const wbsData = await generateWBS(eventData);

    // Save conversation history to MongoDB
    try {
      const sessionId = `generate-${Date.now()}-${eventId}`;
      
      const conversation = await ConversationHistory.create({
        eventId,
        userId,
        sessionId,
        messages: [
          {
            role: 'user',
            content: `Generate WBS for event: ${eventData.eventName}`,
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'WBS generated successfully',
            timestamp: new Date(),
            intent: 'wbs_generated',
            data: { wbs: wbsData },
          },
        ],
        currentEvent: {
          event_name: eventData.eventName,
          event_type: eventData.eventType,
          event_date: eventData.eventDate,
          venue: eventData.venue,
          headcount_total: eventData.headcountTotal,
          departments: eventData.departments,
        },
        wbsGenerated: true,
        wbsData: {
          epics: wbsData.epics_task || wbsData.epics,
          tasks: wbsData.departments || wbsData.tasks,
          risks: wbsData.risks,
          extracted_info: wbsData.extracted_info,
        },
      });
    } catch (error) {
      console.error('Error saving conversation history:', error);
      // Don't fail the request if history save fails
    }

    return res.status(200).json({
      success: true,
      data: wbsData,
      message: 'Generate WBS thành công',
    });
  } catch (error) {
    console.error('Error generating WBS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi generate WBS',
    });
  }
};

/**
 * POST /api/events/:eventId/ai/chat
 * Generate WBS using AI chat interface
 */
export const generateWBSViaChatAI = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // Check if user is HOOC
    const member = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền sử dụng AI chat' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Tin nhắn không được để trống' });
    }

    // Call AI chat service
    let chatResponse;
    try {
      chatResponse = await generateWBSViaChat(message, sessionId);
    } catch (error) {
      // Return a more user-friendly error message
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi chat với AI. Vui lòng kiểm tra xem AI service có đang chạy không.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }

    // Validate chat response
    if (!chatResponse) {
      return res.status(500).json({
        success: false,
        message: 'AI service không trả về dữ liệu. Vui lòng thử lại.',
      });
    }

    // Save conversation history to MongoDB
    try {
      const sessionIdToUse = chatResponse.session_id || sessionId || `session-${Date.now()}`;
      
      // Find or create conversation history
      let conversation = await ConversationHistory.findOne({
        eventId,
        userId,
        sessionId: sessionIdToUse,
      });

      if (!conversation) {
        conversation = await ConversationHistory.create({
          eventId,
          userId,
          sessionId: sessionIdToUse,
          messages: [],
          currentEvent: {},
        });
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Add assistant response
      conversation.messages.push({
        role: 'assistant',
        content: chatResponse.message || '',
        timestamp: new Date(),
        intent: chatResponse.state || 'conversation',
        data: {
          extracted_info: chatResponse.extracted_info,
          wbs: chatResponse.wbs,
          state: chatResponse.state,
        },
      });

      // Update current event if extracted_info exists
      if (chatResponse.extracted_info) {
        conversation.currentEvent = {
          event_name: chatResponse.extracted_info.event_name,
          event_type: chatResponse.extracted_info.event_type,
          event_date: chatResponse.extracted_info.event_date,
          venue: chatResponse.extracted_info.venue,
          headcount_total: chatResponse.extracted_info.headcount_total,
          departments: chatResponse.extracted_info.departments || [],
        };
      }

      // Update WBS data if available
      if (chatResponse.wbs) {
        conversation.wbsGenerated = true;
        conversation.wbsData = {
          epics: chatResponse.wbs.epics_task || chatResponse.wbs.epics,
          tasks: chatResponse.wbs.departments || chatResponse.wbs.tasks,
          risks: chatResponse.wbs.risks,
          extracted_info: chatResponse.extracted_info,
        };
      }

      conversation.updatedAt = new Date();
      await conversation.save();
    } catch (error) {
      console.error('Error saving conversation history:', error);
      // Don't fail the request if history save fails
    }

    return res.status(200).json({
      success: true,
      data: chatResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi chat với AI',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * POST /api/events/:eventId/ai/apply-wbs
 * Apply generated WBS to the event
 */
export const applyWBS = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { epics, tasks, risks } = req.body;
    const userId = req.user.id;

    // Check if user is HOOC
    const member = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền apply WBS' });
    }

    if (!epics || !tasks || !risks) {
      return res.status(400).json({ message: 'Thiếu dữ liệu epics, tasks hoặc risks' });
    }

    // Get departments map
    const departments = await Department.find({ eventId }).lean();
    const deptMap = new Map();
    departments.forEach(dept => {
      deptMap.set(dept.name.toLowerCase(), dept._id);
    });

    // Get HODs for each department
    const hodMap = new Map();
    for (const dept of departments) {
      const hod = await EventMember.findOne({
        eventId,
        departmentId: dept._id,
        role: 'HoD',
      }).lean();
      if (hod) {
        hodMap.set(dept._id.toString(), hod._id);
      }
    }

    const results = {
      epicsCreated: 0,
      tasksCreated: 0,
      risksCreated: 0,
      errors: [],
    };

    // Create Epics and assign to HODs
    for (const epicData of epics) {
      try {
        const deptName = epicData.department || epicData.departmentName;
        const deptId = deptMap.get(deptName?.toLowerCase());
        
        if (!deptId) {
          results.errors.push(`Department "${deptName}" không tồn tại`);
          continue;
        }

        const assignedToId = hodMap.get(deptId.toString());

        const epic = await Epic.create({
          name: epicData.name,
          description: epicData.description || '',
          eventId,
          departmentId: deptId,
          assignedToId: assignedToId || undefined,
          startDate: epicData['start-date'] ? new Date(epicData['start-date']) : undefined,
          endDate: epicData['end-date'] ? new Date(epicData['end-date']) : undefined,
        });

        results.epicsCreated++;
      } catch (error) {
        results.errors.push(`Error creating epic "${epicData.name}": ${error.message}`);
      }
    }

    // Create Tasks with status "suggested"
    for (const taskData of tasks) {
      try {
        const deptName = taskData.department || taskData.departmentName;
        const deptId = deptMap.get(deptName?.toLowerCase());
        
        if (!deptId) {
          results.errors.push(`Department "${deptName}" không tồn tại cho task "${taskData.name}"`);
          continue;
        }

        const task = await Task.create({
          title: taskData.name,
          description: taskData.description || '',
          eventId,
          departmentId: deptId,
          status: 'suggested', // Suggested status
          startDate: taskData['start-date'] ? new Date(taskData['start-date']) : undefined,
          dueDate: taskData.deadline ? new Date(taskData.deadline) : undefined,
          suggestedTeamSize: taskData.suggested_team_size || taskData.suggestedTeamSize || undefined, // Số lượng người dự kiến từ AI
          // Note: assigneeId will be set by HOD later
        });

        results.tasksCreated++;
      } catch (error) {
        results.errors.push(`Error creating task "${taskData.name}": ${error.message}`);
      }
    }

    // Create Risks
    // Handle risks by department
    if (risks.by_department) {
      for (const [deptName, riskList] of Object.entries(risks.by_department)) {
        const deptId = deptMap.get(deptName?.toLowerCase());
        
        if (!deptId) {
          results.errors.push(`Department "${deptName}" không tồn tại cho risks`);
          continue;
        }

        for (const riskData of riskList) {
          try {
            // Map AI risk level to backend risk impact
            const impactMap = {
              'low': 'low',
              'medium': 'medium',
              'high': 'high',
              'critical': 'high',
            };

            await Risk.create({
              departmentId: deptId,
              risk_category: 'others', // Default category, can be updated later
              name: riskData.title || riskData.name,
              impact: impactMap[riskData.level] || 'medium',
              risk_mitigation_plan: riskData.description || '',
              risk_response_plan: riskData.description || '',
            });

            results.risksCreated++;
          } catch (error) {
            results.errors.push(`Error creating risk "${riskData.title}": ${error.message}`);
          }
        }
      }
    }

    // Handle overall risks
    if (risks.overall && Array.isArray(risks.overall)) {
      for (const riskData of risks.overall) {
        try {
          // Assign to first department or create without department
          const firstDept = departments[0];
          if (!firstDept) {
            results.errors.push('Không có department để assign overall risk');
            continue;
          }

          const impactMap = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'high',
          };

          await Risk.create({
            departmentId: firstDept._id,
            risk_category: 'others',
            name: riskData.title || riskData.name,
            impact: impactMap[riskData.level] || 'medium',
            risk_mitigation_plan: riskData.description || '',
            risk_response_plan: riskData.description || '',
          });

          results.risksCreated++;
        } catch (error) {
          results.errors.push(`Error creating overall risk "${riskData.title}": ${error.message}`);
        }
      }
    }

    // Mark conversation as applied
    try {
      const sessionId = req.body.sessionId || `apply-${Date.now()}-${eventId}`;
      await ConversationHistory.updateMany(
        {
          eventId,
          userId,
          wbsGenerated: true,
          applied: false,
        },
        {
          $set: {
            applied: true,
            appliedAt: new Date(),
          },
        }
      );
    } catch (error) {
      console.error('Error updating conversation history:', error);
      // Don't fail the request if history update fails
    }

    return res.status(200).json({
      success: true,
      data: results,
      message: `Đã tạo ${results.epicsCreated} epics, ${results.tasksCreated} tasks, ${results.risksCreated} risks`,
    });
  } catch (error) {
    console.error('Error applying WBS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi apply WBS',
    });
  }
};

/**
 * GET /api/events/:eventId/ai/conversations
 * Get conversation history for an event
 */
export const getConversationHistory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if user is HOOC
    const member = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền xem lịch sử cuộc trò chuyện' });
    }

    const conversations = await ConversationHistory.find({ eventId, userId })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 conversations
      .lean();

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử cuộc trò chuyện',
    });
  }
};

/**
 * GET /api/events/:eventId/ai/conversations/:sessionId
 * Get specific conversation by session ID
 */
export const getConversationBySession = async (req, res) => {
  try {
    const { eventId, sessionId } = req.params;
    const userId = req.user.id;

    // Check if user is HOOC
    const member = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền xem lịch sử cuộc trò chuyện' });
    }

    const conversation = await ConversationHistory.findOne({
      eventId,
      userId,
      sessionId,
    }).lean();

    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy cuộc trò chuyện',
    });
  }
};

