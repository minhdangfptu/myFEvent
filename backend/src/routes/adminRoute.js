import express from 'express';
import {
    getPaginatedUsers,
    getUserProfileWithEvents,
    banUser,
    unbanUser,
    getPaginatedEvents,
    unbanEvent,
    banEvent,
    getEventDetail,
    getDashboardStats,
    getRecentBannedEvents,
    getWeeklyActivity,
    getRecentEvents
} from '../controllers/adminController.js'
import { isAdmin, authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Dashboard routes
router.get('/dashboard/stats', authenticateToken, isAdmin, getDashboardStats);
router.get('/dashboard/recent-banned-events', authenticateToken, isAdmin, getRecentBannedEvents);
router.get('/dashboard/weekly-activity', authenticateToken, isAdmin, getWeeklyActivity);
router.get('/dashboard/recent-events', authenticateToken, isAdmin, getRecentEvents);

// User management routes
router.get('/users',authenticateToken, isAdmin, getPaginatedUsers);
router.get('/users/:userId', authenticateToken, isAdmin, getUserProfileWithEvents);
router.put('/users/:userId/ban', authenticateToken, isAdmin, banUser);
router.put('/users/:userId/unban', authenticateToken, isAdmin, unbanUser);

// Event management routes
router.get('/events', authenticateToken, isAdmin, getPaginatedEvents);
router.get('/events/:eventId', authenticateToken, isAdmin,getEventDetail);
router.put('/events/:eventId/ban', authenticateToken, isAdmin, banEvent);
router.put('/events/:eventId/unban', authenticateToken, isAdmin, unbanEvent);

export default router;