import express from 'express';
import { getUserRoleByEvent } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPassWord } from '../controllers/authController.js';
const router = express.Router();

router.get('/events/:eventId/role', authenticateToken, getUserRoleByEvent);
router.post('/check-password', authenticateToken, checkPassWord);
export default router;