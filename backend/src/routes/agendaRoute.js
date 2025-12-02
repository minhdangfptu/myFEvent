import express from 'express';
import {
    getAgendasByMilestone,
    getFlattenedAgendaItems,
    createAgenda,
    addDateToAgenda,
    updateDateById,
    removeDateById,
    findDateById,
    addItemToDateById,
    updateDayItem,
    removeDayItem,
    getAgendaByEvent
} from '../controllers/agendaController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// === READ OPERATIONS ===

// GET /api/events/:eventId/milestones/:milestoneId/agenda - Lấy agenda theo milestone
router.get('/', authenticateToken, getAgendasByMilestone);

router.get('/by-event', authenticateToken, getAgendaByEvent);

// GET /api/events/:eventId/milestones/:milestoneId/agenda/items - Lấy flattened items
router.get('/items', authenticateToken, getFlattenedAgendaItems);

// === AGENDA DOCUMENT OPERATIONS ===

// POST /api/events/:eventId/milestones/:milestoneId/agenda - Tạo agenda document mới
router.post('/', authenticateToken, createAgenda);

// === DATE MANAGEMENT (ID-based) ===

// POST /api/events/:eventId/milestones/:milestoneId/agenda/dates - Thêm date mới
router.post('/dates', authenticateToken, addDateToAgenda);

// GET /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Tìm date by ID
router.get('/dates/:dateId', authenticateToken, findDateById);

// PATCH /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Update date by ID
router.patch('/dates/:dateId', authenticateToken, updateDateById);

// DELETE /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Xóa date by ID
router.delete('/dates/:dateId', authenticateToken, removeDateById);

// === ITEM MANAGEMENT (ID-based) ===

// POST /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId/items - Thêm item vào date
router.post('/dates/:dateId/items', authenticateToken, addItemToDateById);

// === LEGACY ITEM MANAGEMENT (Index-based for backward compatibility) ===

// PATCH /api/events/:eventId/milestones/:milestoneId/agenda/items - Update item by index
router.patch('/items', authenticateToken, updateDayItem);

// DELETE /api/events/:eventId/milestones/:milestoneId/agenda/items - Xóa item by index
router.delete('/items', authenticateToken, removeDayItem);

export default router;