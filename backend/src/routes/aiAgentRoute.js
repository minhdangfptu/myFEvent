// src/routes/aiAgentRoute.js
import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { runEventPlannerAgent } from '../controllers/aiAgentController.js';

const router = express.Router();

// Test nhanh xem route sống không
router.get('/event-planner/turn', (req, res) => {
  return res.json({
    ok: true,
    message: 'AI Event Planner route is alive (GET test)',
  });
});

// FE sẽ gọi POST này
router.post(
  '/event-planner/turn',
  authenticateToken,
  runEventPlannerAgent
);

export default router;
