import { feedbackService } from '../services/feedbackService.js';

const ok = (res, status, body) => res.status(status).json(body);

const handle = async (res, fn) => {
  try {
    const result = await fn();
    if (result) return ok(res, result.status || 200, result);
  } catch (err) {
    const status = err.status || 500;
    const payload = { message: err.message || 'Internal Server Error' };
    if (err.missingFields) payload.missingFields = err.missingFields;
    console.error('FeedbackController error:', err?.message, err?.stack);
    return ok(res, status, payload);
  }
};

// GET /api/feedback/event/:eventId/forms
export const listFormsByEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId } = req.params;
    const { page, limit } = req.query;
    const result = await feedbackService.listFormsByEvent({ userId, eventId, page, limit });
    return { status: 200, ...result };
  });

// POST /api/feedback/event/:eventId/forms
export const createForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId } = req.params;
    const result = await feedbackService.createForm({ userId, eventId, body: req.body });
    return { status: 201, ...result };
  });

// GET /api/feedback/event/:eventId/forms/:formId
export const getFormDetail = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.getFormDetail({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// PATCH /api/feedback/event/:eventId/forms/:formId
export const updateForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.updateForm({ userId, eventId, formId, body: req.body });
    return { status: 200, ...result };
  });

// DELETE /api/feedback/event/:eventId/forms/:formId
export const deleteForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.deleteForm({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// POST /api/feedback/event/:eventId/forms/:formId/publish
export const publishForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.publishForm({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// POST /api/feedback/event/:eventId/forms/:formId/close
export const closeForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.closeForm({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// POST /api/feedback/event/:eventId/forms/:formId/reopen
export const reopenForm = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.reopenForm({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// GET /api/feedback/event/:eventId/forms/:formId/summary
export const getFormSummary = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.getFormSummary({ userId, eventId, formId });
    return { status: 200, ...result };
  });

// GET /api/feedback/event/:eventId/available-forms
export const getAvailableFormsForMember = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId } = req.params;
    const result = await feedbackService.getAvailableFormsForMember({ userId, eventId });
    return { status: 200, ...result };
  });

// POST /api/feedback/event/:eventId/forms/:formId/submit
export const submitResponse = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.submitResponse({ userId, eventId, formId, body: req.body });
    return { status: 201, ...result };
  });

// GET /api/feedback/event/:eventId/forms/:formId/export
export const exportFormResponses = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId, formId } = req.params;
    const result = await feedbackService.exportFormResponses({ userId, eventId, formId });
    return { status: 200, ...result };
  });