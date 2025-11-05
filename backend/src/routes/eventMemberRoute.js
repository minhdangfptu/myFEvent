import express from 'express';
import {
    getMembersByEvent,
    getUnassignedMembersByEvent,
    getMembersByDepartment
} from '../controllers/eventMemberController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticateToken, getMembersByEvent);
router.get('/unassigned', authenticateToken, getUnassignedMembersByEvent);
router.get('/department/:departmentId', authenticateToken, getMembersByDepartment);

export default router;

