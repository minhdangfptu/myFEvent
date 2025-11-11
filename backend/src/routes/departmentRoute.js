import express from 'express';
import {
  listDepartmentsByEvent,
  getDepartmentDetail,
  createDepartment,
  assignHod,
  changeHoD,
  addMemberToDepartment,
  removeMemberFromDepartment,
  editDepartment,
  
} from '../controllers/departmentController.js';
import {getMembersByDepartment} from "../controllers/eventMemberController.js"
import { createCalendarForDepartment } from "../controllers/calendarController.js";
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticateToken, listDepartmentsByEvent);
router.get('/:departmentId', authenticateToken, getDepartmentDetail);
router.get('/:departmentId/members', authenticateToken, getMembersByDepartment);
router.post('/', authenticateToken, createDepartment);
router.patch('/:departmentId/assign-hod', authenticateToken, assignHod);
router.patch('/:departmentId/change-hod', authenticateToken, changeHoD);
router.post('/:departmentId/members', authenticateToken, addMemberToDepartment);
router.delete('/:departmentId/members/:memberId', authenticateToken, removeMemberFromDepartment);
router.patch('/:departmentId', authenticateToken, editDepartment);
// Calendar endpoints for a department (HoD)
router.post('/:departmentId/calendars/create-calendar-for-department', authenticateToken, createCalendarForDepartment);

export default router;