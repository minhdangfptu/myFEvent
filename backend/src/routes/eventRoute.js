import express from 'express';
import { listPublicEvents, getPublicEventDetail, getPrivateEventDetail, createEvent, joinEventByCode, getEventSummary, listMyEvents, updateEventImage, updateEvent, deleteEvent, getAllEventDetail } from '../controllers/eventController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import milestoneRoute from './milestoneRoute.js';
import departmentRoute from './departmentRoute.js';
import eventMemberRoute from './eventMemberRoute.js';
import riskRoute from './riskRoute.js';
import aiRoute from './aiRoute.js';
import { getAllBudgetsForEvent, getBudgetStatistics } from '../controllers/budgetController.js';
import calendarRoute from './calendarRoute.js';
import exportRoute from './exportRoute.js'


const router = express.Router();

// HoOC: Get all budgets for event - Phải đặt trước route /:id để tránh conflict
router.get('/:eventId/budgets', authenticateToken, getAllBudgetsForEvent);
// Get budget statistics
router.get('/:eventId/budgets/statistics', authenticateToken, getBudgetStatistics);

router.use('/:eventId/milestones',milestoneRoute);
router.use('/:eventId/departments',departmentRoute);
router.use('/:eventId/members', eventMemberRoute);
router.use('/:eventId/risks', riskRoute);
router.use('/:eventId/ai', aiRoute);
router.use('/:eventId/calendars',calendarRoute);
router.use('/:eventId/exports', exportRoute );

// Public events
router.get('/public', listPublicEvents);

// Events joined by current user    
router.get('/me/list', authenticateToken, listMyEvents);

router.get('/:id', getPublicEventDetail);

// Private event detail (authenticated users) - TẠM THỜI BỎ PHÂN QUYỀN
router.get('/private/:id', authenticateToken, getPrivateEventDetail);

// Get all type event detail
router.get('/detail/:id', authenticateToken, getAllEventDetail);

// Create event (any authenticated user)
router.post('/', authenticateToken, createEvent);

// Join by code
router.post('/join', authenticateToken, joinEventByCode);

// Event summary
router.get('/:id/summary', authenticateToken, getEventSummary);

// Event management
router.patch('/:id', authenticateToken, updateEvent);
router.delete('/:id', authenticateToken, deleteEvent);

// Image management
router.patch('/:id/image', authenticateToken, updateEventImage);


export default router;


