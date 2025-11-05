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
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, listDepartmentsByEvent);
router.get('/:departmentId', authenticateToken, getDepartmentDetail);
router.post('/', authenticateToken, createDepartment);
router.patch('/:departmentId/assign-hod', authenticateToken, assignHod);
router.patch('/:departmentId/change-hod', authenticateToken, changeHoD);
router.post('/:departmentId/members', authenticateToken, addMemberToDepartment);
router.delete('/:departmentId/members/:memberId', authenticateToken, removeMemberFromDepartment);
router.patch('/:departmentId', authenticateToken, editDepartment);

export default router;