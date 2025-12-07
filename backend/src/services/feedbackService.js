import FeedbackForm from '../models/feedbackForm.js';
import FeedbackResponse from '../models/feedbackResponse.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import mongoose from 'mongoose';

const HOURS_TO_EXTEND_WHEN_REOPEN = 72;

const autoCloseExpiredForms = async (eventId) => {
  const now = new Date();
  await FeedbackForm.updateMany(
    { eventId, status: 'open', closeTime: { $lt: now } },
    { $set: { status: 'closed' } }
  );
};

const normalizeMultipleChoiceOptions = (options = [], index) => {
  const cleaned = [];
  const seen = new Set();
  options
    .map((opt) => (opt || '').trim())
    .filter((opt) => opt !== '')
    .forEach((opt) => {
      const key = opt.toLowerCase();
      if (!seen.has(key)) {
        cleaned.push(opt);
        seen.add(key);
      }
    });

  if (cleaned.length < 2) {
    const err = new Error(`Câu hỏi ${index + 1} (lựa chọn nhiều) phải có ít nhất 2 lựa chọn hợp lệ`);
    err.status = 400;
    throw err;
  }
  return cleaned;
};

const validateQuestionPayload = (questions = []) => {
  questions.forEach((q, index) => {
    if (!q.questionText || !q.questionText.trim()) {
      const err = new Error(`Câu hỏi ${index + 1} thiếu nội dung`);
      err.status = 400;
      throw err;
    }
    if (!q.questionType) {
      const err = new Error(`Câu hỏi ${index + 1} thiếu loại câu hỏi`);
      err.status = 400;
      throw err;
    }
    if (q.questionType === 'multiple-choice') {
      q.options = normalizeMultipleChoiceOptions(q.options, index);
    }
  });
  return questions;
};

export const feedbackService = {
  // Get all feedback forms for an event (HoOC only)
  async listFormsByEvent({ userId, eventId, page = 1, limit = 10 }) {
    // Check if user is HoOC
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền truy cập');
      err.status = 403;
      throw err;
    }

    const p = Math.max(parseInt(page, 10), 1);
    const lim = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const skip = (p - 1) * lim;

    await autoCloseExpiredForms(eventId);

    const forms = await FeedbackForm.find({ eventId })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean();

    const total = await FeedbackForm.countDocuments({ eventId });

    return {
      data: forms,
      pagination: {
        page: p,
        limit: lim,
        total,
        totalPages: Math.ceil(total / lim)
      }
    };
  },

  async listFormsNameByEvent({ userId, eventId, page = 1, limit = 10 }) {
    // Check if user is HoOC
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền truy cập');
      err.status = 403;
      throw err;
    }

    const p = Math.max(parseInt(page, 10), 1);
    const lim = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const skip = (p - 1) * lim;

    await autoCloseExpiredForms(eventId);

    const forms = await FeedbackForm.find({ eventId })
      .select('name description createAt status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean();

    const total = await FeedbackForm.countDocuments({ eventId });

    return {
      data: forms,
      pagination: {
        page: p,
        limit: lim,
        total,
        totalPages: Math.ceil(total / lim)
      }
    };
  },

  // Create a new feedback form (HoOC only)
  async createForm({ userId, eventId, body }) {
    // Check if user is HoOC
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền tạo biểu mẫu');
      err.status = 403;
      throw err;
    }

    const { name, description, openTime, closeTime, questions } = body;
    // targetAudience luôn là ['Member', 'HoD'], không nhận từ body

    if (!name || !name.trim()) {
      const err = new Error('Tên biểu mẫu là bắt buộc');
      err.status = 400;
      err.missingFields = ['name'];
      throw err;
    }

    if (!openTime || !closeTime) {
      const err = new Error('Thời gian mở và đóng là bắt buộc');
      err.status = 400;
      err.missingFields = ['openTime', 'closeTime'];
      throw err;
    }

    if (new Date(openTime) >= new Date(closeTime)) {
      const err = new Error('Thời gian đóng phải sau thời gian mở');
      err.status = 400;
      throw err;
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      const err = new Error('Biểu mẫu phải có ít nhất một câu hỏi');
      err.status = 400;
      throw err;
    }

    const now = new Date();
    // So sánh chỉ theo ngày (không theo giờ phút) để cho phép chọn ngày hôm nay
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    const openTimeDateOnly = new Date(openTime);
    openTimeDateOnly.setHours(0, 0, 0, 0);
    const closeTimeDateOnly = new Date(closeTime);
    closeTimeDateOnly.setHours(0, 0, 0, 0);
    
    if (openTimeDateOnly < nowDateOnly) {
      const err = new Error('Thời gian mở phải ở hiện tại hoặc tương lai');
      err.status = 400;
      throw err;
    }
    // Ngày đóng phải sau ngày hôm nay (cho phép ngày mai trở đi)
    if (closeTimeDateOnly <= nowDateOnly) {
      const err = new Error('Thời gian đóng phải ở tương lai');
      err.status = 400;
      throw err;
    }

    // Validate questions
    const normalizedQuestions = validateQuestionPayload(questions);

    const form = new FeedbackForm({
      eventId,
      createdBy: userId,
      name: name.trim(),
      description: description?.trim() || '',
      openTime: new Date(openTime),
      closeTime: new Date(closeTime),
      targetAudience: ['Member', 'HoD'], // Luôn set cho Member và HoD
      questions: normalizedQuestions.map((q, index) => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        options: q.questionType === 'multiple-choice' ? q.options : (q.options || []),
        required: q.required !== undefined ? q.required : false,
        order: q.order !== undefined ? q.order : index
      })),
      status: 'draft'
    });

    await form.save();
    return { message: 'Tạo biểu mẫu thành công', data: form };
  },

  // Get form detail (HoOC only)
  async getFormDetail({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền truy cập');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId })
      .populate('createdBy', 'fullName email')
      .lean();

    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    return { data: form };
  },

  // Update form (HoOC only)
  async updateForm({ userId, eventId, formId, body }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền chỉnh sửa');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId });
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    const { name, description, openTime, closeTime, questions } = body;
    
    // Check if trying to update fields other than closeTime for published forms with responses
    const responseCount = await FeedbackResponse.countDocuments({ formId });
    const hasResponses = responseCount > 0;
    const isPublished = form.status === 'open' || form.status === 'closed';
    
    // Allow updating closeTime even for published forms with responses
    // But block other field updates if form is published and has responses
    if (isPublished && hasResponses) {
      const updatingOtherFields = name !== undefined || description !== undefined || 
                                  openTime !== undefined || questions !== undefined;
      if (updatingOtherFields) {
        const err = new Error('Không thể chỉnh sửa biểu mẫu đã có phản hồi. Chỉ có thể thay đổi thời gian đóng.');
        err.status = 400;
        throw err;
      }
    }

    const now = new Date();
    // So sánh chỉ theo ngày (không theo giờ phút) để cho phép chọn ngày hôm nay
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    
    const nextOpenTime = openTime !== undefined ? new Date(openTime) : form.openTime;
    const nextCloseTime = closeTime !== undefined ? new Date(closeTime) : form.closeTime;

    if (nextOpenTime >= nextCloseTime) {
      const err = new Error('Thời gian đóng phải sau thời gian mở');
      err.status = 400;
      throw err;
    }

    if (openTime !== undefined) {
      const nextOpenTimeDateOnly = new Date(nextOpenTime);
      nextOpenTimeDateOnly.setHours(0, 0, 0, 0);
      if (nextOpenTimeDateOnly < nowDateOnly) {
        const err = new Error('Thời gian mở phải ở hiện tại hoặc tương lai');
        err.status = 400;
        throw err;
      }
    }

    if (closeTime !== undefined) {
      const nextCloseTimeDateOnly = new Date(nextCloseTime);
      nextCloseTimeDateOnly.setHours(0, 0, 0, 0);
      // Ngày đóng phải sau ngày hôm nay (cho phép ngày mai trở đi)
      if (nextCloseTimeDateOnly <= nowDateOnly) {
        const err = new Error('Thời gian đóng phải ở tương lai');
        err.status = 400;
        throw err;
      }
    }

    if (name !== undefined) form.name = name.trim();
    if (description !== undefined) form.description = description?.trim() || '';
    form.openTime = nextOpenTime;
    form.closeTime = nextCloseTime;
    // Luôn set targetAudience là ['Member', 'HoD']
    form.targetAudience = ['Member', 'HoD'];

    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        const err = new Error('Biểu mẫu phải có ít nhất một câu hỏi');
        err.status = 400;
        throw err;
      }
      const normalized = validateQuestionPayload(questions);
      form.questions = normalized.map((q, index) => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        options: q.questionType === 'multiple-choice' ? q.options : (q.options || []),
        required: q.required !== undefined ? q.required : false,
        order: q.order !== undefined ? q.order : index
      }));
    }

    await form.save();
    return { message: 'Cập nhật biểu mẫu thành công', data: form };
  },

  // Publish form (HoOC only)
  async publishForm({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền xuất bản');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId });
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    form.status = 'open';
    await form.save();
    
    // Send notification to Members and HoD
    try {
      const { notifyFormPublished } = await import('../services/notificationService.js');
      await notifyFormPublished(eventId, formId);
    } catch (notifError) {
      console.error('Error sending form published notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    return { message: 'Xuất bản biểu mẫu thành công', data: form };
  },

  // Close form (HoOC only)
  async closeForm({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền đóng biểu mẫu');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId });
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    form.status = 'closed';
    await form.save();
    return { message: 'Đóng biểu mẫu thành công', data: form };
  },

  // Reopen form (HoOC only)
  async reopenForm({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền mở lại biểu mẫu');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId });
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (now > form.closeTime) {
      form.closeTime = new Date(now.getTime() + HOURS_TO_EXTEND_WHEN_REOPEN * 60 * 60 * 1000);
    }

    form.status = 'open';
    await form.save();
    return { message: 'Mở lại biểu mẫu thành công', data: form };
  },

  // Get available forms for member to submit (Member only, after event ends)
  async getAvailableFormsForMember({ userId, eventId }) {
    // Check if user is a member of the event
    const member = await EventMember.findOne({ userId, eventId, status: { $ne: 'deactive' } }).lean();
    if (!member) {
      const err = new Error('Bạn không phải thành viên của sự kiện này');
      err.status = 403;
      throw err;
    }

    const now = new Date();
    await autoCloseExpiredForms(eventId);

    // Get forms that match user's role or 'All'
    // Include 'open' forms within time window, and 'closed' forms that user has submitted
    // targetAudience is an array, so we check if it contains 'All' or the member's role
    // In MongoDB, querying { field: value } on an array field will match if the array contains that value
    const allMatchingForms = await FeedbackForm.find({
      eventId,
      status: { $in: ['open', 'closed'] },
      $or: [
        { targetAudience: 'All' },
        { targetAudience: member.role }
      ]
    })
      .select('name description questions openTime closeTime targetAudience status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[getAvailableFormsForMember] Query result: Found ${allMatchingForms.length} forms for role ${member.role}`);
    console.log(`[getAvailableFormsForMember] All matching forms:`, allMatchingForms.map(f => ({
      _id: f._id,
      name: f.name,
      status: f.status,
      targetAudience: f.targetAudience,
      openTime: f.openTime,
      closeTime: f.closeTime
    })));

    // Check which forms user has already submitted
    const submittedFormIds = await FeedbackResponse.find({
      formId: { $in: allMatchingForms.map(f => f._id) },
      userId
    }).distinct('formId');

    // Filter: show 'open' forms within time window, or 'closed' forms that user has submitted
    // Also show 'open' forms that are not yet open (future) or already closed (past) for visibility
    const forms = allMatchingForms.filter(form => {
      if (form.status === 'open') {
        // Show all open forms regardless of time window for visibility
        // Frontend will handle enabling/disabling based on time window
        const openTime = new Date(form.openTime);
        const closeTime = new Date(form.closeTime);
        const isWithinTime = openTime <= now && closeTime >= now;
        console.log(`Form ${form.name} (${form._id}): status=open, isWithinTime=${isWithinTime}, openTime=${openTime}, closeTime=${closeTime}, now=${now}`);
        return true; // Show all open forms
      } else if (form.status === 'closed') {
        // Show closed forms only if user has submitted
        const hasSubmitted = submittedFormIds.some(id => id.toString() === form._id.toString());
        console.log(`Form ${form.name} (${form._id}): status=closed, hasSubmitted=${hasSubmitted}`);
        return hasSubmitted;
      }
      return false;
    });

    console.log(`[getAvailableFormsForMember] eventId=${eventId}, userId=${userId}, member.role=${member.role}`);
    console.log(`[getAvailableFormsForMember] Found ${allMatchingForms.length} matching forms, ${forms.length} after filter`);
    console.log(`[getAvailableFormsForMember] Final forms:`, forms.map(f => ({ name: f.name, status: f.status, targetAudience: f.targetAudience, openTime: f.openTime, closeTime: f.closeTime })));

    const formsWithStatus = forms.map(form => ({
      ...form,
      status: form.status || 'open',
      submitted: submittedFormIds.some(id => id.toString() === form._id.toString())
    }));

    return { data: formsWithStatus };
  },

  // Submit feedback response (Member only)
  async submitResponse({ userId, eventId, formId, body }) {
    // Check if user is a member
    const member = await EventMember.findOne({ userId, eventId, status: { $ne: 'deactive' } }).lean();
    if (!member) {
      const err = new Error('Bạn không phải thành viên của sự kiện này');
      err.status = 403;
      throw err;
    }

    const now = new Date();
    await autoCloseExpiredForms(eventId);

    // Get form
    const form = await FeedbackForm.findOne({ _id: formId, eventId }).lean();
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    // Check if form is open
    if (form.status !== 'open') {
      const err = new Error('Biểu mẫu không còn mở để nhận phản hồi');
      err.status = 400;
      throw err;
    }

    // Check if within time window
    if (now < form.openTime || now > form.closeTime) {
      const err = new Error('Biểu mẫu không trong thời gian nhận phản hồi');
      err.status = 400;
      throw err;
    }

    // Check if user matches target audience
    if (!form.targetAudience.includes('All') && !form.targetAudience.includes(member.role)) {
      const err = new Error('Bạn không thuộc đối tượng được phép phản hồi');
      err.status = 403;
      throw err;
    }

    // Check if already submitted
    const existing = await FeedbackResponse.findOne({ formId, userId });
    if (existing) {
      const err = new Error('Bạn đã gửi phản hồi cho biểu mẫu này');
      err.status = 400;
      throw err;
    }

    // Validate responses
    const { responses } = body;
    if (!responses || !Array.isArray(responses)) {
      const err = new Error('Phản hồi không hợp lệ');
      err.status = 400;
      throw err;
    }

    // Validate each response matches form questions
    const validatedResponses = [];
    for (let i = 0; i < form.questions.length; i++) {
      const question = form.questions[i];
      const response = responses.find(r => r.questionId === i.toString() || r.questionId === question._id?.toString());

      if (question.required && !response) {
        const err = new Error(`Câu hỏi "${question.questionText}" là bắt buộc`);
        err.status = 400;
        throw err;
      }

      if (response) {
        // Validate answer based on question type
        if (question.questionType === 'rating') {
          const rating = parseInt(response.answer);
          if (isNaN(rating) || rating < 1 || rating > 5) {
            const err = new Error(`Câu hỏi "${question.questionText}" yêu cầu đánh giá từ 1-5`);
            err.status = 400;
            throw err;
          }
        } else if (question.questionType === 'multiple-choice') {
          if (!Array.isArray(response.answer) || response.answer.length === 0) {
            const err = new Error(`Câu hỏi "${question.questionText}" yêu cầu chọn ít nhất một lựa chọn`);
            err.status = 400;
            throw err;
          }
        } else if (question.questionType === 'yes-no') {
          if (typeof response.answer !== 'boolean') {
            const err = new Error(`Câu hỏi "${question.questionText}" yêu cầu trả lời Có/Không`);
            err.status = 400;
            throw err;
          }
        }

        validatedResponses.push({
          questionId: i.toString(),
          questionText: question.questionText,
          questionType: question.questionType,
          answer: response.answer
        });
      }
    }

    // Create response
    const feedbackResponse = new FeedbackResponse({
      formId,
      eventId,
      userId,
      responses: validatedResponses,
      submittedAt: now
    });

    await feedbackResponse.save();
    
    // Send notification to HoOC
    try {
      const { notifyResponseSubmitted } = await import('../services/notificationService.js');
      await notifyResponseSubmitted(eventId, formId, member._id);
    } catch (notifError) {
      console.error('Error sending response submitted notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    return { message: 'Gửi phản hồi thành công', data: feedbackResponse };
  },

  // Get summary/statistics for a form (HoOC only)
  async getFormSummary({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền xem thống kê');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId }).lean();
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    const responses = await FeedbackResponse.find({ formId })
      .populate('userId', 'fullName email')
      .lean();

    const totalResponses = responses.length;
    const totalInvited = await EventMember.countDocuments({
      eventId,
      role: { $in: form.targetAudience.includes('All') ? ['Member', 'HoD', 'HoOC'] : form.targetAudience },
      status: { $ne: 'deactive' }
    });

    const completionRate = totalInvited > 0 ? ((totalResponses / totalInvited) * 100).toFixed(1) : 0;

    // Calculate statistics for each question
    const questionStats = form.questions.map((question, index) => {
      const questionResponses = responses
        .map(r => r.responses.find(resp => resp.questionId === index.toString()))
        .filter(Boolean);

      let stats = {
        questionText: question.questionText,
        questionType: question.questionType,
        totalAnswers: questionResponses.length,
        statistics: {}
      };

      if (question.questionType === 'rating') {
        const ratings = questionResponses.map(r => parseInt(r.answer)).filter(r => !isNaN(r));
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = ratings.length > 0 ? (sum / ratings.length).toFixed(1) : 0;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach(r => {
          if (r >= 1 && r <= 5) distribution[r]++;
        });

        stats.statistics = {
          average: parseFloat(avg),
          distribution: distribution,
          percentages: {
            1: ((distribution[1] / ratings.length) * 100).toFixed(1),
            2: ((distribution[2] / ratings.length) * 100).toFixed(1),
            3: ((distribution[3] / ratings.length) * 100).toFixed(1),
            4: ((distribution[4] / ratings.length) * 100).toFixed(1),
            5: ((distribution[5] / ratings.length) * 100).toFixed(1)
          }
        };
      } else if (question.questionType === 'multiple-choice') {
        const allAnswers = questionResponses.flatMap(r => Array.isArray(r.answer) ? r.answer : [r.answer]);
        const distribution = {};
        allAnswers.forEach(answer => {
          distribution[answer] = (distribution[answer] || 0) + 1;
        });

        // Tính percentage dựa trên tổng số responses (giống Google Form)
        // Mỗi option được chọn bao nhiêu lần / tổng số responses
        const totalResponses = questionResponses.length;
        const percentages = {};
        Object.keys(distribution).forEach(key => {
          percentages[key] = totalResponses > 0 
            ? ((distribution[key] / totalResponses) * 100).toFixed(1) 
            : '0.0';
        });

        stats.statistics = {
          distribution,
          percentages,
          totalSelections: allAnswers.length,
          totalResponses: totalResponses
        };
      } else if (question.questionType === 'yes-no') {
        const yesCount = questionResponses.filter(r => r.answer === true).length;
        const noCount = questionResponses.filter(r => r.answer === false).length;
        const total = questionResponses.length;

        stats.statistics = {
          yes: yesCount,
          no: noCount,
          yesPercentage: total > 0 ? ((yesCount / total) * 100).toFixed(1) : 0,
          noPercentage: total > 0 ? ((noCount / total) * 100).toFixed(1) : 0
        };
      } else if (question.questionType === 'text') {
        // Map responses với cả answer và submittedAt từ parent response
        const textAnswersWithTime = responses
          .map(response => {
            const questionResp = response.responses.find(resp => resp.questionId === index.toString());
            if (questionResp && questionResp.answer) {
              return {
                text: questionResp.answer,
                submittedAt: response.submittedAt
              };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) // Sắp xếp mới nhất trước
          .slice(0, 10); // First 10 for preview
        
        stats.statistics = {
          totalTextResponses: textAnswersWithTime.length,
          sampleAnswers: textAnswersWithTime
        };
      }

      return stats;
    });

    return {
      data: {
        form: {
          _id: form._id,
          name: form.name,
          description: form.description,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt
        },
        summary: {
          totalResponses,
          totalInvited,
          completionRate: parseFloat(completionRate),
          lastUpdated: responses.length > 0
            ? responses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0].submittedAt
            : form.updatedAt
        },
        questionStats
      }
    };
  },

  // Delete form (HoOC only)
  async deleteForm({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền xoá biểu mẫu');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId });
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    await FeedbackForm.deleteOne({ _id: formId });
    await FeedbackResponse.deleteMany({ formId });

    return { message: 'Đã xoá biểu mẫu' };
  },

  // Export form responses to Excel format (HoOC only)
  async exportFormResponses({ userId, eventId, formId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền xuất dữ liệu');
      err.status = 403;
      throw err;
    }

    const form = await FeedbackForm.findOne({ _id: formId, eventId }).lean();
    if (!form) {
      const err = new Error('Không tìm thấy biểu mẫu');
      err.status = 404;
      throw err;
    }

    const responses = await FeedbackResponse.find({ formId })
      .populate('userId', 'fullName email')
      .sort({ submittedAt: 1 })
      .lean();

    // Transform responses into flat structure for Excel
    const exportData = [];
    responses.forEach((response) => {
      const user = response.userId || {};
      response.responses.forEach((resp) => {
        let answerText = '';
        if (resp.questionType === 'rating') {
          answerText = `${resp.answer} sao`;
        } else if (resp.questionType === 'multiple-choice') {
          answerText = Array.isArray(resp.answer) ? resp.answer.join(', ') : String(resp.answer);
        } else if (resp.questionType === 'yes-no') {
          answerText = resp.answer ? 'Có' : 'Không';
        } else {
          answerText = String(resp.answer || '');
        }

        exportData.push({
          submittedAt: response.submittedAt,
          userFullName: user.fullName || 'N/A',
          userEmail: user.email || 'N/A',
          questionText: resp.questionText || '',
          questionType: resp.questionType || '',
          answer: answerText
        });
      });
    });

    return { data: exportData, formName: form.name };
  },

  // Get all feedback for an event (HoOC only)
  async getAllEventFeedback({ userId, eventId }) {
    const membership = await ensureEventRole(userId, eventId, ['HoOC']);
    if (!membership) {
      const err = new Error('Bạn không có quyền truy cập');
      err.status = 403;
      throw err;
    }

    // Get event info
    const event = await Event.findById(eventId).select('name').lean();
    if (!event) {
      const err = new Error('Không tìm thấy sự kiện');
      err.status = 404;
      throw err;
    }

    // Get all forms for this event
    const forms = await FeedbackForm.find({ eventId })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    if (forms.length === 0) {
      return {
        data: {
          eventName: event.name,
          eventId,
          totalForms: 0,
          forms: []
        }
      };
    }

    // Get all responses for all forms
    const formIds = forms.map(f => f._id);
    const allResponses = await FeedbackResponse.find({
      formId: { $in: formIds }
    })
      .populate('userId', 'fullName email')
      .sort({ submittedAt: -1 })
      .lean();

    // Group responses by formId
    const responsesByForm = {};
    formIds.forEach(id => {
      responsesByForm[id.toString()] = [];
    });

    allResponses.forEach(response => {
      const formIdStr = response.formId.toString();
      if (responsesByForm[formIdStr]) {
        responsesByForm[formIdStr].push(response);
      }
    });

    // Build data structure
    const formsWithResponses = forms.map(form => {
      const formIdStr = form._id.toString();
      const responses = responsesByForm[formIdStr] || [];

      return {
        _id: form._id,
        name: form.name,
        description: form.description,
        status: form.status,
        openTime: form.openTime,
        closeTime: form.closeTime,
        targetAudience: form.targetAudience,
        createdBy: form.createdBy,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        questions: form.questions,
        responses: responses.map(r => ({
          _id: r._id,
          userId: r.userId,
          responses: r.responses,
          submittedAt: r.submittedAt
        })),
        totalResponses: responses.length
      };
    });

    return {
      data: {
        eventName: event.name,
        eventId,
        totalForms: forms.length,
        totalResponses: allResponses.length,
        forms: formsWithResponses
      }
    };
  }
};

export const getFeedbackFormsForExport = async (eventId) => {
  try {
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return { eventName: '', forms: [] };
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const [eventDoc, forms] = await Promise.all([
      Event.findById(eventObjectId).select('name').lean(),
      FeedbackForm.find({ eventId: eventObjectId })
        .sort({ createdAt: 1 })
        .lean()
    ]);

    if (!forms.length) {
      return { eventName: eventDoc?.name || '', forms: [] };
    }

    const formIds = forms.map((form) => form._id);
    const responses = await FeedbackResponse.find({ formId: { $in: formIds } })
      .populate('userId', 'fullName email')
      .sort({ submittedAt: 1 })
      .lean();

    const responseMap = new Map();
    formIds.forEach((id) => responseMap.set(id.toString(), []));

    responses.forEach((resp) => {
      const key = resp.formId?.toString();
      if (!key || !responseMap.has(key)) return;

      const answerMap = {};
      (resp.responses || []).forEach((answer) => {
        if (!answer) return;
        const answerKey = (answer.questionId ?? '').toString();
        answerMap[answerKey] = answer.answer;
      });

      responseMap.get(key).push({
        submittedAt: resp.submittedAt,
        userName: resp.userId?.fullName || 'N/A',
        userEmail: resp.userId?.email || 'N/A',
        answers: answerMap
      });
    });

    const formsWithResponses = forms.map((form) => {
      const questions = (form.questions || []).map((question, index) => {
        const questionOrder =
          typeof question.order === 'number' ? question.order : index;
        return {
          questionId: index.toString(),
          text: question.questionText || `Câu hỏi ${index + 1}`,
          type: question.questionType || 'text',
          order: questionOrder,
          index
        };
      });

      questions.sort((a, b) => {
        if (a.order === b.order) return a.index - b.index;
        return a.order - b.order;
      });

      return {
        id: form._id?.toString(),
        name: form.name || 'Biểu mẫu phản hồi',
        description: form.description || '',
        questions,
        responses: responseMap.get(form._id?.toString()) || []
      };
    });

    return {
      eventName: eventDoc?.name || '',
      forms: formsWithResponses
    };
  } catch (error) {
    console.error('❌ Error fetching feedback forms for export:', error);
    return { eventName: '', forms: [] };
  }
};

