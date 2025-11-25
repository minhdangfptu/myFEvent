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
    getCalendarDetail,
    getAvailableMembers,
    addParticipants,
    removeParticipant,
    sendReminder
} from '../controllers/calendarController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// List calendar events
router.get('/', authenticateToken, getCalendarsForEvent);
router.get('/my-event-calendars', authenticateToken, getMyCalendarInEvent);
router.get('/:calendarId', authenticateToken, getCalendarDetail);
router.get('/:calendarId/available-members', authenticateToken, getAvailableMembers);

// Create calendar
router.post('/create-calendar-for-event', authenticateToken, createCalendarForEvent);
router.post('/create-calendar-for-department', authenticateToken, createCalendarForDepartment);

// Manage participants
router.post('/:calendarId/participants', authenticateToken, addParticipants);
router.delete('/:calendarId/participants/:memberId', authenticateToken, removeParticipant);
router.patch('/:calendarId/participate-status', authenticateToken, updateParticipateStatus);
router.post('/:calendarId/reminders', authenticateToken, sendReminder);

router.put('/:calendarId', authenticateToken, updateCalendarForEvent);

export default router;