import express from 'express';
import {
    getCalendarsForEvent,
    getCalendarsForDepartment,
    createCalendarForEntity,
    updateCalendarForEntity,
    getMyCalendarInEvent,
    updateParticipateStatus
} from '../controllers/calendarController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// List calendar events
router.get('/', authenticateToken, getCalendarsForEvent);
router.get('/', authenticateToken, getCalendarsForDepartment);
router.get('/my-event-calendars', authenticateToken, getMyCalendarInEvent);

export default router;