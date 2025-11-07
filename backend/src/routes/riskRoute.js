// src/routes/riskRoute.js
import { Router } from 'express';
import {
  listRisksByEvent,
  getRiskDetail,
  createRisk,
  updateRisk,
  deleteRisk,
  getRiskStatistics,
  getRisksByCategoryStats,
} from '../controllers/riskController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router({ mergeParams: true });

// /:eventId/risk
router.get('/', authenticateToken, listRisksByEvent);
router.post('/', authenticateToken, createRisk);

// /:eventId/risk/stats
router.get('/stats', authenticateToken, getRiskStatistics);
router.get('/stats/categories', authenticateToken, getRisksByCategoryStats);

// /:eventId/risk/:riskId
router.get('/:riskId', authenticateToken, getRiskDetail);
router.patch('/:riskId', authenticateToken, updateRisk);
router.delete('/:riskId', authenticateToken, deleteRisk);

export default router;