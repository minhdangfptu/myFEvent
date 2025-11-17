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
import { authenticateToken } from '../middlewares/authMiddleware.js';
import budgetRoute from './budgetRoute.js';

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

// Budget routes
router.use('/:departmentId/budget', budgetRoute);

export default router;