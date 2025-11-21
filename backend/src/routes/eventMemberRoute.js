import express from 'express';
import {
    getMembersByEvent,
    getUnassignedMembersByEvent,
    getMembersByDepartment,
    getMemberDetail,
    getCoreTeamList,
    leaveEvent,
    updateMemberRole,
    changeMemberDepartment,
    removeMemberFromEvent,
} from '../controllers/eventMemberController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticateToken, getMembersByEvent);
router.get('/unassigned', authenticateToken, getUnassignedMembersByEvent);
router.get('/coreteam', authenticateToken, getCoreTeamList);
router.get('/department/:departmentId', authenticateToken, getMembersByDepartment);
router.get('/:memberId', authenticateToken, getMemberDetail); 
router.delete('/me', authenticateToken, leaveEvent);
router.patch('/:memberId/role', authenticateToken, updateMemberRole);
router.patch('/:memberId/department', authenticateToken, changeMemberDepartment);
router.delete('/:memberId', authenticateToken, removeMemberFromEvent);
router.delete('/:memberId', authenticateToken, removeMemberFromEvent);

export default router;

