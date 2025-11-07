import FeedbackForm from '../models/feedbackForm.js';
import FeedbackResponse from '../models/feedbackResponse.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';

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

    // Validate questions
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
      if (q.questionType === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        const err = new Error(`Câu hỏi ${index + 1} (multiple-choice) phải có ít nhất 2 lựa chọn`);
        err.status = 400;
        throw err;
      }
    });

    const form = new FeedbackForm({
      eventId,
      createdBy: userId,
      name: name.trim(),
      description: description?.trim() || '',
      openTime: new Date(openTime),
      closeTime: new Date(closeTime),
      targetAudience: ['Member', 'HoD'], // Luôn set cho Member và HoD
      questions: questions.map((q, index) => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        options: q.options || [],
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

    if (name !== undefined) form.name = name.trim();
    if (description !== undefined) form.description = description?.trim() || '';
    if (openTime !== undefined) form.openTime = new Date(openTime);
    if (closeTime !== undefined) form.closeTime = new Date(closeTime);
    // Luôn set targetAudience là ['Member', 'HoD']
    form.targetAudience = ['Member', 'HoD'];

    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        const err = new Error('Biểu mẫu phải có ít nhất một câu hỏi');
        err.status = 400;
        throw err;
      }
      form.questions = questions.map((q, index) => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        options: q.options || [],
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
      const err = new Error('Không thể mở lại biểu mẫu đã quá thời gian đóng');
      err.status = 400;
      throw err;
    }

    form.status = 'open';
    await form.save();
    return { message: 'Mở lại biểu mẫu thành công', data: form };
  },

  // Get available forms for member to submit (Member only, after event ends)
  async getAvailableFormsForMember({ userId, eventId }) {
    // Check if user is a member of the event
    const member = await EventMember.findOne({ userId, eventId }).lean();
    if (!member) {
      const err = new Error('Bạn không phải thành viên của sự kiện này');
      err.status = 403;
      throw err;
    }

    // Check if event has ended
    const event = await Event.findById(eventId).lean();
    if (!event) {
      const err = new Error('Không tìm thấy sự kiện');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (event.eventEndDate && new Date(event.eventEndDate) > now) {
      const err = new Error('Sự kiện chưa kết thúc');
      err.status = 400;
      throw err;
    }

    // Get open forms that match user's role or 'All'
    const forms = await FeedbackForm.find({
      eventId,
      status: 'open',
      openTime: { $lte: now },
      closeTime: { $gte: now },
      $or: [
        { targetAudience: 'All' },
        { targetAudience: member.role }
      ]
    })
      .select('name description questions openTime closeTime targetAudience')
      .sort({ createdAt: -1 })
      .lean();

    // Check which forms user has already submitted
    const submittedFormIds = await FeedbackResponse.find({
      formId: { $in: forms.map(f => f._id) },
      userId
    }).distinct('formId');

    const formsWithStatus = forms.map(form => ({
      ...form,
      submitted: submittedFormIds.some(id => id.toString() === form._id.toString())
    }));

    return { data: formsWithStatus };
  },

  // Submit feedback response (Member only)
  async submitResponse({ userId, eventId, formId, body }) {
    // Check if user is a member
    const member = await EventMember.findOne({ userId, eventId }).lean();
    if (!member) {
      const err = new Error('Bạn không phải thành viên của sự kiện này');
      err.status = 403;
      throw err;
    }

    // Check if event has ended
    const event = await Event.findById(eventId).lean();
    if (!event) {
      const err = new Error('Không tìm thấy sự kiện');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (event.eventEndDate && new Date(event.eventEndDate) > now) {
      const err = new Error('Sự kiện chưa kết thúc');
      err.status = 400;
      throw err;
    }

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
      role: { $in: form.targetAudience.includes('All') ? ['Member', 'HoD', 'HoOC'] : form.targetAudience }
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
  }
};

