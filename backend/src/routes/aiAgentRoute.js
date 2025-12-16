// src/routes/aiAgentRoute.js
import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  runEventPlannerAgent,
  listAgentSessions,
  getAgentSession,
  applyEventPlannerPlan,
} from '../controllers/AIController/aiAgentController.js';

const router = express.Router();

// Test nhanh xem route sống không
router.get('/event-planner/turn', (req, res) => {
  return res.json({
    ok: true,
    message: 'AI Event Planner route is alive (GET test)',
  });
});

// FE sẽ gọi POST này cho từng lượt agent
router.post(
  '/event-planner/turn',
  authenticateToken,
  runEventPlannerAgent
);

// Áp dụng kế hoạch EPIC/TASK mà agent đã sinh ra (preview → apply)
router.post(
  '/event-planner/apply-plan',
  authenticateToken,
  applyEventPlannerPlan
);

// Danh sách các cuộc trò chuyện (giống sidebar ChatGPT)
router.get(
  '/event-planner/sessions',
  authenticateToken,
  listAgentSessions
);

// Chi tiết một cuộc trò chuyện
router.get(
  '/event-planner/sessions/:sessionId',
  authenticateToken,
  getAgentSession
);

export default router;
