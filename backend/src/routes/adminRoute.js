import express from 'express';
import {
    getPaginatedUsers,
    getUserProfileWithEvents,
    banUser,
    unbanUser,
    getPaginatedEvents,
    unbanEvent,
    banEvent,
    getEventDetail
} from '../controllers/adminController.js'
import { isAdmin, authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/users',authenticateToken, isAdmin, getPaginatedUsers);
router.get('/users/:userId', authenticateToken, isAdmin, getUserProfileWithEvents);
router.put('/users/:userId/ban', authenticateToken, isAdmin, banUser);
router.put('/users/:userId/unban', authenticateToken, isAdmin, unbanUser);

router.get('/events', authenticateToken, isAdmin, getPaginatedEvents);
router.get('/events/:eventId', authenticateToken, isAdmin,getEventDetail);
router.put('/events/:eventId/ban', authenticateToken, isAdmin, banEvent);
router.put('/events/:eventId/unban', authenticateToken, isAdmin, unbanEvent);

export default router;