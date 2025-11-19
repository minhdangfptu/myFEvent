import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  listFormsByEvent,
  createForm,
  getFormDetail,
  updateForm,
  deleteForm,
  publishForm,
  closeForm,
  reopenForm,
  getAvailableFormsForMember,
  submitResponse,
  getFormSummary,
  exportFormResponses
} from '../controllers/feedbackController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// HoOC routes - Form management
router.get('/event/:eventId/forms', listFormsByEvent);
router.post('/event/:eventId/forms', createForm);
router.get('/event/:eventId/forms/:formId', getFormDetail);
router.patch('/event/:eventId/forms/:formId', updateForm);
router.delete('/event/:eventId/forms/:formId', deleteForm);
router.post('/event/:eventId/forms/:formId/publish', publishForm);
router.post('/event/:eventId/forms/:formId/close', closeForm);
router.post('/event/:eventId/forms/:formId/reopen', reopenForm);

// Member routes - Submit feedback
router.get('/event/:eventId/available-forms', getAvailableFormsForMember);
router.post('/event/:eventId/forms/:formId/submit', submitResponse);
router.get('/event/:eventId/forms/:formId/summary', getFormSummary);
router.get('/event/:eventId/forms/:formId/export', exportFormResponses);

export default router;


