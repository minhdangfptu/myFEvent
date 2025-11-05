import express from 'express';
import {
  createMilestone,
  listMilestones,
  getMilestoneDetail,
  updateMilestone,
  deleteMilestone
} from '../controllers/milestoneController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
// Milestone routes
router.post('/',authenticateToken, createMilestone);
router.get('/',authenticateToken, listMilestones);
router.get('/:milestoneId',authenticateToken, getMilestoneDetail);
router.patch('/:milestoneId',authenticateToken, updateMilestone);
router.delete('/:milestoneId',authenticateToken, deleteMilestone);

export default router;