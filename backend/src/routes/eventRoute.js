import express from 'express';
import { listPublicEvents, getPublicEventDetail, getPrivateEventDetail, createEvent, joinEventByCode, getEventSummary, listMyEvents, replaceEventImages, addEventImages, removeEventImages, updateEvent, deleteEvent, getAllEventDetail } from '../controllers/eventController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import milestoneRoute from './milestoneRoute.js';
import departmentRoute from './departmentRoute.js';
import eventMemberRoute from './eventMemberRoute.js';
import riskRoute from './riskRoute.js';

const router = express.Router();

router.use('/:eventId/milestones',milestoneRoute);
router.use('/:eventId/departments',departmentRoute);
router.use('/:eventId/members', eventMemberRoute);
router.use('/:eventId/risks', riskRoute);

// Public events
router.get('/public', listPublicEvents);
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

// Events joined by current user
router.get('/me/list', authenticateToken, listMyEvents);

// Event management
router.patch('/:id', authenticateToken, updateEvent);
router.delete('/:id', authenticateToken, deleteEvent);

// Image management
router.patch('/:id/images', authenticateToken, replaceEventImages);
router.post('/:id/images', authenticateToken, addEventImages);
router.delete('/:id/images', authenticateToken, removeEventImages);


export default router;


