import express from 'express';
import {
  getDepartmentBudget,
  getDepartmentBudgetById,
  createDepartmentBudget,
  updateDepartmentBudget,
  submitBudget,
  recallBudget,
  deleteDepartmentBudget,
  saveReviewDraft,
  completeReview,
  updateCategories,
  sendBudgetToMembers,
  reportExpense,
  togglePaidStatus,
  assignItem,
  submitExpense,
  undoSubmitExpense,
  getAllBudgetsForDepartment,
} from '../controllers/budgetController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/departments/:departmentId/budgets - Get all budgets for department
router.get('/budgets', authenticateToken, getAllBudgetsForDepartment);

// GET /api/events/:eventId/departments/:departmentId/budget/:budgetId - Get specific budget by ID
router.get('/:budgetId', authenticateToken, getDepartmentBudgetById);

// GET /api/events/:eventId/departments/:departmentId/budget
router.get('/', authenticateToken, getDepartmentBudget);

// POST /api/events/:eventId/departments/:departmentId/budget
router.post('/', authenticateToken, createDepartmentBudget);

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId
router.patch('/:budgetId', authenticateToken, updateDepartmentBudget);

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/submit
router.post('/:budgetId/submit', authenticateToken, submitBudget);

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/recall
router.post('/:budgetId/recall', authenticateToken, recallBudget);

// DELETE /api/events/:eventId/departments/:departmentId/budget/:budgetId
router.delete('/:budgetId', authenticateToken, deleteDepartmentBudget);

// HoOC: Save review draft
// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/review/draft
router.patch('/:budgetId/review/draft', authenticateToken, saveReviewDraft);

// HoOC: Complete review
// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/review/complete
router.post('/:budgetId/review/complete', authenticateToken, completeReview);

// HoD: Update categories
// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/categories
router.patch('/:budgetId/categories', authenticateToken, updateCategories);

// HoD: Send budget to members
// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/send-to-members
router.post('/:budgetId/send-to-members', authenticateToken, sendBudgetToMembers);

// Member: Report expense
// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/report-expense
router.post('/:budgetId/items/:itemId/report-expense', authenticateToken, reportExpense);

// Toggle paid status
// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/toggle-paid
router.patch('/:budgetId/items/:itemId/toggle-paid', authenticateToken, togglePaidStatus);

// Assign item to member
// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/assign
router.patch('/:budgetId/items/:itemId/assign', authenticateToken, assignItem);

// Submit expense
// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/submit-expense
router.post('/:budgetId/items/:itemId/submit-expense', authenticateToken, submitExpense);

// Undo submit expense
// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/undo-submit
router.post('/:budgetId/items/:itemId/undo-submit', authenticateToken, undoSubmitExpense);

export default router;

