import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  generateWBSWithAI,
  generateWBSViaChatAI,
  applyWBS,
  getConversationHistory,
  getConversationBySession,
} from '../controllers/aiController.js';

const router = express.Router({ mergeParams: true });

// POST /api/events/:eventId/ai/generate-wbs
router.post('/generate-wbs', authenticateToken, generateWBSWithAI);

// POST /api/events/:eventId/ai/chat
router.post('/chat', authenticateToken, generateWBSViaChatAI);

// POST /api/events/:eventId/ai/apply-wbs
router.post('/apply-wbs', authenticateToken, applyWBS);

// GET /api/events/:eventId/ai/conversations
router.get('/conversations', authenticateToken, getConversationHistory);

// GET /api/events/:eventId/ai/conversations/:sessionId
router.get('/conversations/:sessionId', authenticateToken, getConversationBySession);

export default router;

