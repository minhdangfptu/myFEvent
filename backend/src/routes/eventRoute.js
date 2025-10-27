import express from 'express';
import { listPublicEvents, getPublicEventDetail, getPrivateEventDetail, createEvent, joinEventByCode, getEventSummary, listMyEvents, replaceEventImages, addEventImages, removeEventImages, updateEvent, deleteEvent, getAllEventDetail } from '../controllers/eventController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  createMilestone,
  listMilestones,
  getMilestoneDetail,
  updateMilestone,
  deleteMilestone
} from '../controllers/milestoneController.js';
import {
  listDepartmentsByEvent,
  getDepartmentDetailByEvent,
  assignHod,
  addMemberToDepartment,
  removeMemberFromDepartment,
} from '../controllers/departmentController.js';
import { getMembersByEvent } from '../controllers/eventMemberController.js';

const router = express.Router();

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

router.post('/:eventId/milestones', authenticateToken, createMilestone);
router.get('/:eventId/milestones', authenticateToken, listMilestones);
router.get('/:eventId/milestones/:milestoneId', authenticateToken, getMilestoneDetail);
router.patch('/:eventId/milestones/:milestoneId', authenticateToken, updateMilestone);
router.delete('/:eventId/milestones/:milestoneId', authenticateToken, deleteMilestone);

router.get('/:eventId/departments', authenticateToken, listDepartmentsByEvent);
router.get('/:eventId/departments/:departmentId', authenticateToken, getDepartmentDetailByEvent);

// Department management
router.patch('/:eventId/departments/:departmentId/assign-hod', authenticateToken, assignHod);
router.post('/:eventId/departments/:departmentId/members', authenticateToken, addMemberToDepartment);
router.delete('/:eventId/departments/:departmentId/members/:userId', authenticateToken, removeMemberFromDepartment);


//Event role 

export default router;


