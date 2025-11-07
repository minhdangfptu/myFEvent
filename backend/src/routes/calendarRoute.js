import express from 'express';
import {
    getCalendarsForEvent,
    getCalendarsForDepartment,
    getCalendarEventDetail,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
} from '../controllers/calendarController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// List calendar events
router.get('/', authenticateToken, getCalendarsForEvent);
router.get('/', authenticateToken, getCalendarsForDepartment);