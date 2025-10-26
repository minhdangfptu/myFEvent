import express from 'express';
import { getUserRoleByEvent } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get('/events/:eventId/role', authenticateToken, getUserRoleByEvent);

export default router;