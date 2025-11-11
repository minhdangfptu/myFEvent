import express from 'express';
import {
    getCalendarsForEvent,
    getCalendarsForDepartment,
    createCalendarForEntity,
    createCalendarForEvent,
    createCalendarForDepartment,
    updateCalendarForEntity,
    getMyCalendarInEvent,
    updateParticipateStatus,
    getCalendarDetail
} from '../controllers/calendarController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';
import { uploadFiles } from '../middlewares/uploadMiddleware.js';
import multer from 'multer';

const router = express.Router({ mergeParams: true });

// List calendar events
router.get('/', authenticateToken, getCalendarsForEvent);
router.get('/my-event-calendars', authenticateToken, getMyCalendarInEvent);
router.get('/:calendarId', authenticateToken, getCalendarDetail);
// Error handler for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Maximum is 10 files' });
        }
        return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Create calendar - with multer middleware to handle FormData
router.post('/create-calendar-for-event', authenticateToken, uploadFiles, handleMulterError, createCalendarForEvent);
router.post('/create-calendar-for-department', authenticateToken, uploadFiles, handleMulterError, createCalendarForDepartment);

export default router;