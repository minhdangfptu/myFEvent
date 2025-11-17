import express from 'express';
import {
    getCalendarsForEvent,
    getCalendarsForDepartment,
    createCalendarForEntity,
    createCalendarForEvent,
    createCalendarForDepartment,
    updateCalendarForEvent,
    getMyCalendarInEvent,
    updateParticipateStatus,
    getCalendarDetail
} from '../controllers/calendarController.js';

import { authenticateRefreshToken, authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// List calendar events
router.get('/', authenticateToken, getCalendarsForEvent);
router.get('/my-event-calendars', authenticateToken, getMyCalendarInEvent);
router.get('/:calendarId', authenticateToken, getCalendarDetail);

// Create calendar
router.post('/create-calendar-for-event', authenticateToken, createCalendarForEvent);
router.post('/create-calendar-for-department', authenticateToken, createCalendarForDepartment);

// Update participate status
router.patch('/:calendarId/participate-status', authenticateToken, updateParticipateStatus);

router.put('/:calendarId', authenticateToken, updateCalendarForEvent);

export default router;