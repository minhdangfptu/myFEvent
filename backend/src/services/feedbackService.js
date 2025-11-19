import FeedbackForm from '../models/feedbackForm.js';
import FeedbackResponse from '../models/feedbackResponse.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';

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
    if (new Date(openTime) < now) {
      const err = new Error('Thời gian mở phải ở hiện tại hoặc tương lai');
      err.status = 400;
      throw err;
    }
    if (new Date(closeTime) <= now) {
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

    // Can't update if form is published and has responses
    if (form.status === 'open' || form.status === 'closed') {
      const responseCount = await FeedbackResponse.countDocuments({ formId });
      if (responseCount > 0) {
        const err = new Error('Không thể chỉnh sửa biểu mẫu đã có phản hồi');
        err.status = 400;
        throw err;
      }
    }

    const { name, description, openTime, closeTime, questions } = body;

    const now = new Date();
    const nextOpenTime = openTime !== undefined ? new Date(openTime) : form.openTime;
    const nextCloseTime = closeTime !== undefined ? new Date(closeTime) : form.closeTime;

    if (nextOpenTime >= nextCloseTime) {
      const err = new Error('Thời gian đóng phải sau thời gian mở');
      err.status = 400;
      throw err;
    }

    if (openTime !== undefined && nextOpenTime < now) {
      const err = new Error('Thời gian mở phải ở hiện tại hoặc tương lai');
      err.status = 400;
      throw err;
    }

    if (closeTime !== undefined && nextCloseTime <= now) {
      const err = new Error('Thời gian đóng phải ở tương lai');
      err.status = 400;
      throw err;
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

        const percentages = {};
        Object.keys(distribution).forEach(key => {
          percentages[key] = ((distribution[key] / allAnswers.length) * 100).toFixed(1);
        });

        stats.statistics = {
          distribution,
          percentages,
          totalSelections: allAnswers.length
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
        const textAnswers = questionResponses.map(r => r.answer).filter(Boolean);
        stats.statistics = {
          totalTextResponses: textAnswers.length,
          sampleAnswers: textAnswers.slice(0, 10) // First 10 for preview
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
  }
};

