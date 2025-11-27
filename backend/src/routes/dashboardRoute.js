import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { getDashboardOverview } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/:eventId', authenticateToken, getDashboardOverview);

export default router;


