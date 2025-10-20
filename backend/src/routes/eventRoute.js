import express from 'express';
import { listPublicEvents, getPublicEventDetail } from '../controllers/eventController.js';
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
  removeMemberFromDepartment
} from '../controllers/departmentController.js';

const router = express.Router();

// Public events
router.get('/public', listPublicEvents);
router.get('/:id', getPublicEventDetail);

// Nested resources under event (protected)
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

export default router;


